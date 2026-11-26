# ElectraGuard - Maestro UI tests

Android app (`com.electraguard.app`) ke liye end-to-end tests. Total 58 test cases hain.

## Folder structure

| Folder | Kya hai |
|---|---|
| `auth/` | Splash, Login, OTP, Register, Forgot password |
| `consumer/` | Home, CSV upload aur detection, Report theft, Learn, Support, Chatbot, Profile |
| `admin/` | Dashboard, Risks, Consumer profile, Cases, Escalate, Reports, Profile |
| `subflows/` | Login, logout, OTP jaise reusable steps. Ye akele nahi chalte. |
| `test-data/` | CSV upload test ki sample file |
| `reports/` | Screenshots aur JUnit XML reports yahan save hote hain |

## Pehli baar setup

1. Phone USB se connect karein. `adb devices` mein phone `device` ke saath nazar aana chahiye.
2. [run_tests.ps1](run_tests.ps1) kholein aur upar wale hisse mein apne test accounts likhein:
   - `CONSUMER_EMAIL`, `CONSUMER_PASSWORD`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `ISSUE_TYPE`: Report screen ke "Select Issue Type" dropdown mein jo naam nazar aata hai
3. App ki language **English** honi chahiye, kyun ke tests English text dhoondte hain.

## Chalane ka tareeqa

`ElectraGuard` folder mein PowerShell kholein:

```powershell
.\.maestro\run_tests.ps1                    # saare tests
.\.maestro\run_tests.ps1 -Suite smoke       # sirf zaroori (smoke) tests
.\.maestro\run_tests.ps1 -Suite consumer    # sirf consumer tests
.\.maestro\run_tests.ps1 -Flow consumer\05_chatbot.yaml   # sirf ek test
.\.maestro\run_tests.ps1 -IncludeWrites     # wo tests bhi jo asli data banate hain
```

## OTP ke baare mein

Login ke baad app email par 6-digit code bhejti hai. Jab test OTP screen par ruke to **3 minute ke andar phone par code khud type kar dein**, test aage chal parega. Uske baad phone 7 din ke liye trusted ho jata hai, is liye har baar code nahi mangega.

Auth tests app ka data clear karte hain (`clearState`), is liye unke baad pehle consumer aur admin login par OTP dobara aa sakta hai.

## Asli data banane wale tests

Ye tests tag `writes-data` ke saath hain aur default mein **skip** hote hain. Ye sirf `-IncludeWrites` ke saath chalte hain:

- `AUTH-15`: naya consumer account banata hai
- `CON-10`: theft report submit karta hai
- `ADM-08`: naya case banata hai

`AUTH-19` consumer ke email par asli password-reset code bhejta hai. `CON-03` aur `CON-05` ML API aur AI chatbot par depend karte hain, is liye internet aur backend chalna chahiye.

## Test cases

| ID | Test case | File | Tags |
|---|---|---|---|
| AUTH-01 | Splash screen opens Login | `auth/01_splash_to_login.yaml` | auth, smoke |
| AUTH-02 | Login with empty fields shows error | `auth/02_login_empty_fields.yaml` | auth, negative |
| AUTH-03 | Login with wrong password fails | `auth/03_login_wrong_password.yaml` | auth, negative |
| AUTH-04 | Login with unregistered consumer ID fails | `auth/04_login_unknown_consumer.yaml` | auth, negative |
| AUTH-05 | Consumer/Admin portal switch changes the form | `auth/05_portal_switch.yaml` | auth, ui |
| AUTH-06 | Consumer login with OTP reaches dashboard | `auth/06_login_consumer_success.yaml` | auth, smoke, otp |
| AUTH-07 | Admin login with OTP reaches dashboard | `auth/07_login_admin_success.yaml` | auth, smoke, otp |
| AUTH-08 | Wrong login OTP is rejected | `auth/08_otp_wrong_code.yaml` | auth, negative, otp |
| AUTH-09 | Register with empty fields shows error | `auth/09_register_empty_fields.yaml` | auth, register, negative |
| AUTH-10 | Consumer ID field removes special characters | `auth/10_register_invalid_consumer_id.yaml` | auth, register, negative |
| AUTH-11 | Register with short CNIC | `auth/11_register_short_cnic.yaml` | auth, register, negative |
| AUTH-12 | Register with mismatched passwords | `auth/12_register_password_mismatch.yaml` | auth, register, negative |
| AUTH-13 | Register with weak password | `auth/13_register_weak_password.yaml` | auth, register, negative |
| AUTH-14 | Register without accepting Terms | `auth/14_register_terms_not_agreed.yaml` | auth, register, negative |
| AUTH-15 | Register a new consumer (creates a real account) | `auth/15_register_success.yaml` | auth, register, writes-data |
| AUTH-16 | Register screen Sign in link goes back to Login | `auth/16_register_back_to_login.yaml` | auth, register, navigation |
| AUTH-17 | Forgot password with empty field shows error | `auth/17_forgot_password_empty.yaml` | auth, forgot-password, negative |
| AUTH-18 | Forgot password Back to sign in works | `auth/18_forgot_password_back.yaml` | auth, forgot-password, navigation |
| AUTH-19 | Forgot password sends code, wrong code is rejected | `auth/19_forgot_password_wrong_otp.yaml` | auth, forgot-password, otp |
| CON-01 | Home dashboard shows consumer info | `consumer/01_home_dashboard.yaml` | consumer, smoke |
| CON-02 | Submit Units without a CSV shows error | `consumer/02_submit_units_without_file.yaml` | consumer, csv, negative |
| CON-03 | Upload CSV and get theft detection result | `consumer/03_upload_csv_detection.yaml` | consumer, csv, ml |
| CON-04 | Help and support screen opens | `consumer/04_support_screen.yaml` | consumer, support |
| CON-05 | AI chatbot answers a question | `consumer/05_chatbot.yaml` | consumer, support, ai |
| CON-06 | Learn tab shows energy awareness content | `consumer/06_learn_screen.yaml` | consumer, learn |
| CON-07 | Report without issue type shows error | `consumer/07_report_no_issue_type.yaml` | consumer, report, negative |
| CON-08 | Report without description shows error | `consumer/08_report_no_description.yaml` | consumer, report, negative |
| CON-09 | Report without meter location shows error | `consumer/09_report_no_location.yaml` | consumer, report, negative |
| CON-10 | Submit a theft report (creates a real case) | `consumer/10_report_submit_success.yaml` | consumer, report, writes-data |
| CON-11 | Report screen shows my cases and DISCO contacts | `consumer/11_report_my_cases_and_contacts.yaml` | consumer, report |
| CON-12 | Profile screen shows all sections | `consumer/12_profile_screen.yaml` | consumer, profile, smoke |
| CON-13 | Profile Information modal shows user details | `consumer/13_profile_info_modal.yaml` | consumer, profile |
| CON-14 | System Settings modal shows language and theme | `consumer/14_system_settings.yaml` | consumer, profile, settings |
| CON-15 | Change password with empty fields shows error | `consumer/15_change_password_empty.yaml` | consumer, profile, negative |
| CON-16 | Change password with mismatched new passwords | `consumer/16_change_password_mismatch.yaml` | consumer, profile, negative |
| CON-17 | Privacy Policy opens | `consumer/17_privacy_policy.yaml` | consumer, profile |
| CON-18 | Notifications screen opens from Profile | `consumer/18_notifications.yaml` | consumer, notifications |
| CON-19 | Logout cancel keeps user logged in | `consumer/19_logout_cancel.yaml` | consumer, profile |
| CON-20 | Consumer logout returns to Login | `consumer/20_logout.yaml` | consumer, profile, smoke |
| ADM-01 | Admin dashboard shows KPIs | `admin/01_dashboard.yaml` | admin, smoke |
| ADM-02 | Dashboard Open cases button opens Case Management | `admin/02_dashboard_open_cases.yaml` | admin, navigation |
| ADM-03 | Dashboard View risk list opens Risks | `admin/03_dashboard_risk_list.yaml` | admin, navigation |
| ADM-04 | Risk filters work | `admin/04_risks_filters.yaml` | admin, risks |
| ADM-05 | Risk search with no match shows empty list | `admin/05_risks_search.yaml` | admin, risks |
| ADM-06 | Open a high-risk consumer profile | `admin/06_consumer_profile.yaml` | admin, risks |
| ADM-07 | Create case without description shows error | `admin/07_create_case_missing_fields.yaml` | admin, cases, negative |
| ADM-08 | Create a case (creates real data) | `admin/08_create_case_success.yaml` | admin, cases, writes-data |
| ADM-09 | Case overview and status filters | `admin/09_cases_overview_filters.yaml` | admin, cases |
| ADM-10 | Open a case and see details | `admin/10_case_profile.yaml` | admin, cases |
| ADM-11 | Case Send update section is visible | `admin/11_case_send_update_empty.yaml` | admin, cases |
| ADM-12 | Escalate without details shows error | `admin/12_escalate_missing_fields.yaml` | admin, cases, negative |
| ADM-13 | Close case dialog can be cancelled | `admin/13_close_case_cancel.yaml` | admin, cases |
| ADM-14 | Reports screen shows charts | `admin/14_reports.yaml` | admin, reports |
| ADM-15 | Reports period filter changes data | `admin/15_reports_period_filter.yaml` | admin, reports |
| ADM-16 | Admin profile shows all sections | `admin/16_admin_profile.yaml` | admin, profile |
| ADM-17 | Admin notifications screen opens | `admin/17_admin_notifications.yaml` | admin, notifications |
| ADM-18 | Admin System Settings opens | `admin/18_admin_settings.yaml` | admin, profile, settings |
| ADM-19 | Admin logout returns to Login | `admin/19_admin_logout.yaml` | admin, smoke |

## Agar test fail ho

- `maestro studio` chala kar dekhein ke screen par element ka text kya hai.
- `CON-03` mein phone ka file picker brand ke hisaab se alag hota hai. Agar file na mile to "Downloads" wala step apne phone ke mutabiq badlein.
- Text ke bajaye `testID` laga dein to tests zyada mazboot ho jate hain. Lekin iske baad naya APK banana parega.
