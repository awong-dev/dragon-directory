#!/usr/bin/perl -w
use strict;

use lib '~/bin';

use Data::Dumper;
use Text::CSV;

my %classes;
my %buses;
my %neighborhood_schools;
my $family_count;

my @grade_thingy = qw(st nd rd th th);

sub get_child_information {
  my ($family, $num) = @_;
  my $first = $family->{"student #$num name (first)"};
  my $last = $family->{"student #$num name (last)"};
  my $bus = $family->{"bus route"};
  my $neighborhood_school = $family->{"neighborhood school"};
  if (!$first && !$last) {
     return undef;
  }
  
  my @parents = get_parents($family);

  my $teacher = $family->{"student #$num teacher"};
  my $grade = $family->{"student #$num grade level:"} ||
              $family->{"student #$num grade level"};
  
  my $child = {
    "name" => "$first $last",
    "bus" => $bus,
    "teacher" => $teacher,
    "grade" => $grade,
    "neighborhood_school" => $neighborhood_school,
    "parents" => \@parents,
  };

  my ($teacher_first, $teacher_last) = split ' ', $teacher;
  my $teacher_name_to_sort;
  if (defined $teacher_last) {
      $teacher_name_to_sort = "${teacher_last}-${teacher_first}-${grade}";
  } else {
      $teacher_name_to_sort = "${teacher_first}-${grade}";
  }      

  $classes{$teacher_name_to_sort}->{teacher_name_to_sort} = $teacher_name_to_sort;
  $classes{$teacher_name_to_sort}->{teacher} = $teacher;
  $classes{$teacher_name_to_sort}->{grade} = $grade;
  push @{$classes{$teacher_name_to_sort}->{students}}, $child;

  $buses{$bus}->{bus} = $bus;
  push @{$buses{$bus}->{students}}, $child;

  $neighborhood_schools{$neighborhood_school}->{neighborhood_school} = $neighborhood_school;
  push @{$neighborhood_schools{$neighborhood_school}->{students}}, $child;

}

sub get_children {
   my ($row) = @_;

   for my $num (1..4) {
      get_child_information($row, $num);
   }
}

sub get_parent_information {
  my ($family, $num) = @_;
  my $first = $family->{"parent / guardian #$num name (first)"};
  my $last = $family->{"parent / guardian #$num name (last)"};
  my $cell = $family->{"parent / guardian #$num phone"};
  my $email = $family->{"parent / guardian #$num email"};
  if (!$first && !$last) {
     return undef;
  }
  my $parent = {
               "name" => "$first $last",
               "cell" => $cell,
               "email" => $email,
               }; 
  return $parent;
}

sub get_parents {
   my ($row) = @_;

   my @parents;
   for my $num (1..3) {
      my $parent = get_parent_information($row, $num);
      if ($parent) {
        push @parents, $parent;
      }
   }
   return @parents;
}

sub bus_label {
  my ($bus) = @_;
  if ($bus =~ /^\d+$/) {  
    return "Bus #$bus";
  } else {
    return $bus;
  }
}

sub teacher_label {
    my ($grade, $teacher) = @_;

    my $output = $grade <= 5 ? "${grade}$grade_thingy[$grade-1] grade" : "Pre-K";
    if ($teacher eq 'Unknown') {
	$output .= " - Teacher Unknown";
    } else {
	$output .= " - ${teacher}";
    }
    return $output;
}

sub print_html_head {
  print "<html>\n";
  print "<head>\n";
  print "<style>\n";
  print "table, th, td {\n";
  print "  border; 0x solid black;\n";
  print "}\n";
  print "</style>\n";
  print "</head>\n";
  print "<body>\n";
}

sub print_html_tail {
  print "</body>\n";
  print "</html>\n";
}

sub print_table_head {
  print "<table style=\"width:100%\">\n";
}

sub print_table_tail {
  print "</table>\n";
  print "<br>\n";
}

sub print_student_teacher {
  my ($student) = @_;

  print "<tr>\n";
  print "<td colspan=\"2\">", $student->{name}, "</td>";
  print "<td colspan=\"2\">", teacher_label($student->{grade}, $student->{teacher}), "</td>\n";
  print "</tr>\n";
}

sub print_student_parents {
  my ($student) = @_;

  for my $parent (@{$student->{parents}}) {
    print "<tr>\n";
    print "<td style=\"width:5%\"></td>", "<td style=\"width:25%\">", $parent->{name}, "</td><td style=\"width:25%\">", $parent->{cell}, "</td><td style=\"width:45%\">", $parent->{email}, "</td>\n";
    print "</tr>\n";
  }
}

sub print_classes {
  my @classes = 
      sort { $a->{grade} <=> $b->{grade} ||
             $a->{teacher_name_to_sort} cmp $b->{teacher_name_to_sort} }
        values %classes;

  print_html_head();

  print "<h1>Directory by Grade and Teacher</h1>\n";

  for my $class (@classes) {
    print "<h2>", teacher_label($class->{grade}, $class->{teacher}), "</h2>", "\n";

    for my $student (sort { $a->{name} cmp $b->{name} }
		       @{$class->{students}}) 
    {
      print_table_head();

      print "<tr>\n";
      print "<td colspan=\"4\">", $student->{name}, "</td>";
      print "</tr>\n";

      print_student_parents($student);

      if ($student->{neighborhood_school} && $student->{neighborhood_school} ne "Unspecified") {
          print "<tr>\n";
          print "<td></td><td><i>Neighborhood School</i></td>", "<td colspan=\"2\">", $student->{neighborhood_school}, "</td>\n";
          print "</tr>\n";
      }
      my $bus_label = bus_label($student->{bus});
      if ($bus_label ne 'Unspecified') {
          print "<tr>\n";
          print "<td></td><td><i>Bus Route</i></td>", "<td colspan=\"2\">", $bus_label, "</td>\n";
          print "</tr>\n";
      }

      print_table_tail();
    }
  }

  print_html_tail();
}

sub print_buses {
  my @buses = 
      sort { $a->{bus} cmp $b->{bus} }
        values %buses;

  print_html_head();

  print "<h1>Directory by Bus Route</h1>\n";

  for my $bus (@buses) {

    if ($bus->{bus} eq "Other" || $bus->{bus} eq "Unspecified") {
      next;
    }

    print "<h2>", bus_label($bus->{bus}), "</h2>\n";

    for my $student (sort { $a->{name} cmp $b->{name} }
		       @{$bus->{students}}) 
    {
      print_table_head();

      print_student_teacher($student);

      print_student_parents($student);

      print_table_tail();
    }
  }

  print_html_tail();
}

sub print_by_school {
  my @schools =
      sort { $a->{neighborhood_school} cmp $b->{neighborhood_school} }
        values %neighborhood_schools;

  print_html_head();

  print "<h1>Directory by Neighborhood School</h1>\n";
  for my $school (@schools) {

    if ($school->{neighborhood_school} eq "Unspecified") {
      next;
    }

    print "<h2>", $school->{neighborhood_school}, "</h2>\n";

    for my $student (sort { $a->{name} cmp $b->{name} }
                       @{$school->{students}})
    {
      print_table_head();

      print_student_teacher($student);

      print_student_parents($student);

      print_table_tail();
    }
  }

  print_html_tail();
}

sub main {
  my @rows;
  my $csv = Text::CSV->new ({binary=>1})
                 or die "Cannot use CSV: ".Text::CSV->error_diag ();

  my ($filename, $export_type) = @ARGV;
  open(my $fh, "<", $filename) or die "$!";

  my $maybe_bom = "";
  for my $c (1..4) {
      $maybe_bom .= getc($fh);
  }
  if ($maybe_bom ne "\x09\xef\xbb\xbf") {  # the broken gravity forms BOM
      seek($fh, 0, 0);
  }

  $csv->header ($fh);
  while (my $row = $csv->getline_hr ($fh)) {
    my $child = get_children($row);
    $family_count++;
  }

  $csv->eof or $csv->error_diag();
  close $fh;

  if (defined $export_type) {
    if ($export_type eq "classes") {
      print_classes();
    }
    if ($export_type eq "buses") {
      print_buses();
    }
    if ($export_type eq "school") {
      print_by_school();
    }
  }

#  print $family_count;
}

main();

