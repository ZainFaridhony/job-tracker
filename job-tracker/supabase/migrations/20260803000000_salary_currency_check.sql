-- Applied to the cloud project as the migration `salary_currency_check`.
-- Combined here as the repo record.
--
-- salary_currency was provisioned in onboarding_profile_fields and left in the
-- UPDATE grant, but never constrained — unlike its siblings work_location and
-- salary_period. It had no reader or writer until the salary field grew a
-- currency picker, so nothing noticed.
--
-- Mirrors SALARY_CURRENCIES in apps/dashboard/lib/onboarding/steps.ts. Extend
-- both together, or a newly offered code fails as an unexplained 400 mid-wizard.
--
-- `is null or` matches the sibling constraints: null stays legal for the rows
-- that predate the picker.
alter table public.profiles
  add constraint profiles_salary_currency_check
    check (
      salary_currency is null
      or salary_currency in ('IDR','USD','SGD','MYR','EUR','GBP','AUD','JPY')
    );
