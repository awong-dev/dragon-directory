<?php
/*
 * Plugin Name: Dragon Directory
 * Description: Generates the Dragon Directory from the given forms.
 * Version: 0.1
 */

namespace DragonDirectory;

const PLUGIN_NAME = 'dragondirectory';
const SETTINGS_GROUP = PLUGIN_NAME . '-group';
const OPTION_FORM_ACCESS_CONFIG = PLUGIN_NAME . '_form_access_config';
const OPTION_ACCESS_CODE = PLUGIN_NAME . '_access_password';
const OPTION_FORM_ID = PLUGIN_NAME . '_form_id';
const OPTION_SELECT_CRITERIA = PLUGIN_NAME . '_select_criteria';
const OPTION_EXPORTED_COLUMNS = PLUGIN_NAME . '_exported_columns';
const DISABLE_ACCESS_CODE_VALUE = '==Disable Access Code==';

function options_page_html() {
    // check user capabilities
    if (!current_user_can('manage_options')) {
        return;
    }

    ?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        See bottom for example values.
        Also, remember that when using the form for access code, putting "admin:" before
        the access code will link the student names to the gravity form entry.
        <form action="options.php" method="post">
            <?php
            // output security fields for the registered setting "wporg_options"
            settings_fields(SETTINGS_GROUP);
            // output setting sections and their fields
            do_settings_sections(PLUGIN_NAME);
            // output save settings button
            submit_button(__('Save Settings', 'textdomain'));
            ?>
        </form>
        <div>
        <table border=1>
        <tr><td>Form Access Config is a json dict of form id to a shared access code.
            The access code is a weak-speed bump to avoid easy directory access.
            It's a shared password by nature.  Set it to something.  If you really
            want to disable it, set it to the magic string <?php DISABLE_ACCESS_CODE_VALUE ?> </td></tr>

        <tr><td>The select criteria is a json array listing a positive filter for all entries retrieved. This must be set to at least an empty array (eg []) just to ensure the site admin thinks about it. Rows retrieved here are made avaiable via a REST API as long as the access code is given so you do NOT want to select any rows that should be kept private. An example of such a filter is:
        <p>
        <pre>
        <code>
        [ {
            "key": "Include your family in the Dragon Directory?",
            "value": "Yes"
          }
        ]
        </code>
        </pre>
        </p></td></tr>

        <tr><td>The columns to export is a list of which columns to put into the rest
        response. Combined with select criteria you can decide what information from the form
        to expose. (It's basically a quasi sql query). An example set of data would be:

        <pre>
        <code>
        [ "Parent / Guardian #1 Name",
          "Parent / Guardian #1 Email",
          "Parent / Guardian #1 Phone",
          "Student #1 Name",
          "Student #1 Grade Level",
          "Student #1 Teacher",
          "Parent / Guardian #2 Name",
          "Parent / Guardian #2 Email",
          "Parent / Guardian #2 Phone",
          "Student #2 Name",
          "Student #2 Grade Level",
          "Student #2 Teacher",
          "Parent / Guardian #3 Name",
          "Parent / Guardian #3 Email",
          "Parent / Guardian #3 Phone",
          "Student #3 Name",
          "Student #3 Grade Level",
          "Student #3 Teacher",
          "Parent / Guardian #4 Name",
          "Parent / Guardian #4 Email",
          "Parent / Guardian #4 Phone",
          "Student #4 Name",
          "Student #4 Grade Level",
          "Student #4 Teacher",
          "Neighborhood School",
          "Neighborhood School",
          "Bus Route" ]
        </code>
        </pre>
        </div>
    </div>
    <?php
}

function dragon_directory_options_page()
{
    add_options_page(
        'Dragon Directory Options',
        'Dragon Directory',
        'manage_options',
        PLUGIN_NAME,
        options_page_html(...),
    );
}

/**
 * Load the Dragon Directory
 * @return void
 */
function dragon_directory_load() {
    add_action('admin_menu', dragon_directory_options_page(...));
}

// We need to call the function with the namespace
add_action( 'plugins_loaded', dragon_directory_load(...));

function field_html_text($val) {
    $id = $val['id'];
    ?>
        <input
            class="dd-input"
            type="text"
            name="<?= $id ?>"
            id="<?= $id ?>"
            value="<?= esc_attr( get_option( $id ) ) ?>"
        />
    <?php
}

function field_html_formid($val) {
    $id = $val['id'];
    ?>
        <input
            class="dd-input"
            type="number"
            name="<?= $id ?>"
            id="<?= $id ?>"
            min="0"
            step="1"
            value="<?= esc_attr( get_option( $id ) ) ?>"
        />
    <?php
}

function field_html_textarea($val) {
    $id = $val['id'];
    ?>
        <textarea
            class="dd-input"
            rows=5
            name="<?= $id ?>"
            id="<?= $id ?>"
        ><?= get_option($id) ?></textarea>
    <?php
}

function register_plugin_setting($id, $description, $default = '', $type = 'string', $sanitizer = NULL, $html_func = NULL) {

    if ($sanitizer == NULL) {
        $sanitizer = sanitize_text_field(...);
    }

    if ($html_func == NULL) {
        $html_func = field_html_text(...);
    }

    register_setting(SETTINGS_GROUP, $id,
        array(
            'type' => $type,
            'sanitize_callback' => $sanitizer,
            'default' => $default,
        ));
    add_settings_field($id, $description,
        $html_func, PLUGIN_NAME, 'general', array( 'id' => $id ));
}

function sanitize_field_id($input) {
    $fieldId = (int) $input;
    if ($fieldId <= 0) {
        // There should never be form with id -1.
        return "invalid form id";
    }

    return $fieldId;
}

/**
 * Registers the settings for DragonDigest.
 *
 * Here are the setting groups.
 *   1. Access configuration (password)
 *   2. Source form settings.
 *       a. Which form to use.
 *       b. Which fields to select.
 *       c. What rows to select.
 *
 * https://presscoders.com/wordpress-settings-api-explained/
 **/
function register_my_setting() {
    add_settings_section('general', 'General', false, PLUGIN_NAME);

    register_plugin_setting(OPTION_FORM_ACCESS_CONFIG,
        'Form Acccess Config', '{}',
        'text', sanitize_text_field(...), field_html_textarea(...));
    register_plugin_setting(OPTION_SELECT_CRITERIA,
        'JSON list of row select criteria', makeDefaultSelectCriteria(),
        'text', sanitize_text_field(...), field_html_textarea(...));
    register_plugin_setting(OPTION_EXPORTED_COLUMNS,
        'JSON list of columns to export', makeDefaultExportedColumns(),
        'text', sanitize_text_field(...), field_html_textarea(...));
}

add_action('admin_init', register_my_setting(...));

function get_field_with_label($form, $label) {
    foreach ($form['fields'] as $field) {
        if ($field->label == $label) {
            return $field;
        }
    }
    return false;
}

function to_field_id($form, $label) {
    $field = get_field_with_label($form, $label);
    if ($field) {
        return $field->id;
    }
    return false;
}

// Entries will look like:
//  $columns[2] => array (
//     'label' => 'some field label',
//  )
//
//  $columns[4] => array (
//     'type' => 'name',
//     'label' => 'parent #1 name',
//     'inputs' => array (
//            'Prefix' => array (
//               'id' => '4.2'
//               'label' => 'First'
//               'value' => 'Kylo'
//            )
//         '
//     )
//  )
//
// Regular fields just have an 'id'. These fields have no "inputs".
//
// For Advanced fields 'type' is set to the kind of field it is (eg, "name",
// "email", etc). Depending on the 'type', it may have an 'inputs' section
// of subfields. 'name' is an example of a type with subfields.
//
// It is okay to check for the existence of 'inputs' to see if it is a
// composite field and ignore 'type' if there's no extra processing
// necesasry. An example would be outputing the value of an 'email' field.
function addColumn(&$columns, $form, $label) {
    $field = get_field_with_label($form, $label);
    if ($field === false) {
        echo "Count not find column: '$label'";
        throw new \Exception('Could not find column ' . $label);
        return;
    }

    $columns[$field->id] = array(
        'label' => $field->label,
        'type' => $field->type,
        );

    # See https://docs.gravityforms.com/field-object/#name-and-address
    # These are the only fields with 'inputs'.
    if (isset($field->inputs)) {
      $inputs = array();
      foreach ($field->inputs as $i) {
          if (!($i['isHidden'] ?? false)) {
              $inputs[$i['id']] = array(
                  'label' => $i['label'],
                  'type' => 'subfield',
                  );
          }
      }
      $columns[$field->id]['inputs'] = $inputs;
    }
}

function makeDefaultSelectCriteria() {
    // Format is array of (key, expted_value) paris. All must match for a row
    // be selected.
    $criteria = [
          [ 'key' => 'Include your family in the Dragon Directory?', 'value' => 'Yes'],
    ];

    // See https://core.trac.wordpress.org/ticket/21767 for stripslashes.
    return stripslashes(json_encode($criteria, JSON_PRETTY_PRINT));
}

function makeDefaultExportedColumns() {
    $columns = array();
    for ($i = 1; $i <= 4; $i++) {
      $columns[] = "Parent / Guardian #$i Name";
      $columns[] = "Parent / Guardian #$i Email";
      $columns[] = "Parent / Guardian #$i Phone";

      $columns[] = "Student #$i Name";
      $columns[] = "Student #$i Grade Level";
      $columns[] = "Student #$i Teacher";
    }

    $columns[] = 'Neighborhood School';
    $columns[] = 'Neighborhood School';
    $columns[] = 'Bus Route';

    // See https://core.trac.wordpress.org/ticket/21767 for stripslashes.
    return stripslashes(wp_json_encode($columns, JSON_PRETTY_PRINT));
}

function createAllColumns($form) {
    $columns = array();

    // Add all custom columns.
    $column_labels = json_decode(
        get_option(OPTION_EXPORTED_COLUMNS, makeDefaultExportedColumns()),
        JSON_THROW_ON_ERROR);
    foreach ($column_labels as $label) {
        addColumn($columns, $form, $label);
    }

    // Add the audit columns.
    $columns['date_created'] = array(
      'label' => 'meta:date_created',
      'type' => 'date',
    );
    $columns['date_updated'] = array(
      'label' => 'meta:date_updated',
      'type' => 'date',
    );
    $columns['id'] = array(
      'label' => 'meta:entry_id',
      'type' => 'text',
    );

    return $columns;
}

function get_selected_entries($form_id) {
    $form = \GFAPI::get_form($form_id);
    if (!$form) {
        return ["form_id" => $form_id, "column_info" => [], "rows" => []];
    }

    $columns = createAllColumns($form);

    // Positive filter the rows for selection.
    $field_filters = array(
        'mode' => 'any',
    );
    /*
    $filters_json = trim(get_option(OPTION_SELECT_CRITERIA, ""));
    if (!$filters_json) {
      // Don't allow an unset field.
      return array("column_info" => $columns, "rows" => ["1" => "select filter unset"]);
    }

    foreach (json_decode($filters_json, JSON_THROW_ON_ERROR) as $entry) {
        $field_label = $entry['key'];

        // Pick out the values to avoid passing random params through.
        $field_filters[] = array('key' => $field_label, 'value' => $entry['value']);
    }
    */

    $search_criteria = array(
        'status'        => 'active',
        'field_filters' => $field_filters
        );

    $paging = array('offset' => 0, 'page_size' => 1000);
    $selected_data = array();
    while (1) {
        $entries = \GFAPI::get_entries($form_id, $search_criteria, null, $paging);
        $num_results = count($entries);
        if ($num_results == 0) {
            break;
        }
        $paging['offset'] = $paging['offset'] + $num_results;

        // Only extract the requested columns. Putting ALL data into the
        // JSON object with leak private information about form submissions
        // on to the webpage.
        foreach ($entries as $row) {
            $new_row = array();
            foreach ($columns as $field_id => $column_info) {
                if ($column_info['inputs'] ?? false) {
                    // If there are 'inputs' the top-level field isn't in $row.
                    // Instead, iterate each of 'inputs' and put that into the
                    // new row.
                    foreach ($column_info['inputs'] as $input_id => $input_info) {
                        if ($row[$input_id]) {
                            $new_row[$input_id] = $row[$input_id];
                        }
                    }
                } else {
                    if (isset($row[$field_id])) {
                        if ($row[$field_id]) {
                            $new_row[$field_id] = $row[$field_id];
                        }
                    }
                }
            }
            if ($new_row) {
                $selected_data[] = $new_row;
            }
        }
    }

    return array("form_id" => $form_id, "column_info" => $columns, "rows" => $selected_data);
}

function rest_get_entries($request) {
    $access_code_config = json_decode(
        get_option(OPTION_FORM_ACCESS_CONFIG, '{}'),
        JSON_THROW_ON_ERROR);

    $req_form_id = $request->get_param('form_id');

    if (!isset($access_code_config[$req_form_id])) {
        return new \WP_Error(
            'unknown_form_id',
            'Unknown Form ID',
            array('status' => 404));
    }

    $password = $access_code_config[$req_form_id];

    if ($password !== DISABLE_ACCESS_CODE_VALUE &&
        $password !== $request->get_param('access_code')) {
        return new \WP_Error(
            'invalid_access_code',
            'Invalid Access Code',
            array('status' => 401));
    }

    return get_selected_entries($req_form_id);
}

add_action('rest_api_init', function () {
    register_rest_route(PLUGIN_NAME . "/v1", '/entries', array(
          'methods' => 'GET',
          'callback' => rest_get_entries(...),
          'permission_callback' => '__return_true',
          ));
    });

function wpdocs_enqueue_custom_admin_style() {
        wp_register_style( PLUGIN_NAME . '_admin_css', plugins_url('/dragon-directory-admin.css', __FILE__), false, '1.0.0' );
        wp_enqueue_style( PLUGIN_NAME . '_admin_css' );
}
add_action('admin_enqueue_scripts', wpdocs_enqueue_custom_admin_style(...));
