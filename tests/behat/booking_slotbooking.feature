@mod @mod_booking @booking_slotbooking
Feature: Create and book slot booking options with list and calendar interfaces
  As a teacher
  I need to create slot booking options and book the third slot as a student

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                | idnumber |
      | teacher1 | Teacher   | 1        | teacher1@example.com | T1       |
      | student1 | Student   | 1        | student1@example.com | S1       |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion |
      | Course 1 | C1        | 0        | 1                |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | teacher1 | C1     | manager        |
      | student1 | C1     | student        |
    And I clean booking cache
    And the following "activities" exist:
      | activity | course | name         | intro                    | bookingmanager | eventtype |
      | booking  | C1     | Slot booking | Slot booking description | teacher1       | Webinar   |
    And the following "mod_booking > options" exist:
      | booking      | text                      | course | description          | optiontype | slot_type | slot_booking_view_mode | slot_max_participants_per_slot | slot_max_slots_per_user | optiondateid_0 | daystonotify_0 | coursestarttime_0           | courseendtime_0             | optiondateid_1 | daystonotify_1 | coursestarttime_1           | courseendtime_1             | optiondateid_2 | daystonotify_2 | coursestarttime_2           | courseendtime_2             |
      | Slot booking | Slot booking option list  | C1     | Slot booking in list | 2          | session   | list                   | 1                              | 3                       | 0              | 0              | ## 15 March 2050 13:00 ##   | ## 15 March 2050 14:00 ##   | 0              | 0              | ## 16 March 2050 13:00 ##   | ## 16 March 2050 14:00 ##   | 0              | 0              | ## 17 March 2050 13:00 ##   | ## 17 March 2050 14:00 ##   |
      | Slot booking | Slot booking option cal   | C1     | Slot booking in cal  | 2          | session   | calendar               | 1                              | 1                       | 0              | 0              | ## 15 March 2050 15:00 ##   | ## 15 March 2050 16:00 ##   | 0              | 0              | ## 16 March 2050 15:00 ##   | ## 16 March 2050 16:00 ##   | 0              | 0              | ## 17 March 2050 15:00 ##   | ## 17 March 2050 16:00 ##   |
    And I change viewport size to "1366x10000"

  @javascript
  Scenario: Book the third slot using list interface
    Given I am on the "Slot booking" Activity page logged in as student1
    And I click on "Book now" "text" in the "//tr[contains(., 'Slot booking option list')]" "xpath_element"
    And I should see "Please choose one available slot before continuing with the booking." in the ".booking-slotbooking-prepage" "css_element"
    And "input[name='slot_selection_cb_2']" "css_element" should exist
    And I set the field "slot_selection_cb_2" to "checked"
    And I follow "Continue"
    Then I should see "You have successfully booked Slot booking option list" in the ".condition-confirmation" "css_element"

  @javascript
  Scenario: Book the third slot using calendar interface
    Given I am on the "Slot booking" Activity page logged in as student1
    And I click on "Book now" "text" in the "//tr[contains(., 'Slot booking option cal')]" "xpath_element"
    And I should see "Please choose one available slot before continuing with the booking." in the ".booking-slotbooking-prepage" "css_element"
    And ".booking-slot-calendar-grid .booking-slot-calendar-day-btn" "css_element" should exist
    And I click on "17" "button" in the ".booking-slot-calendar-grid" "css_element"
    And I click on ".booking-slot-calendar-slot-list button" "css_element"
    And I follow "Continue"
    Then I should see "You have successfully booked Slot booking option cal" in the ".condition-confirmation" "css_element"
