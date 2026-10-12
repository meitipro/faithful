# Mutations

Written by `python scripts/mutate.py --table docs/MUTATIONS.md`. 80 defences in
`contracts/faithful.py` were each broken on their own, and every mutant was caught. Each row
names the first test that failed against it, read from pytest's report rather than an exit code.
The generated-copy and deployed-record tests are excluded, because they fail for any edit at all.

| # | defence broken | caught by |
|---|---|---|
| 1 | maintainer check: anyone passes | `tests/test_direct.py::test_only_the_maintainer_adds_and_never_after_close` |
| 2 | add_sections: no maintainer check | `tests/test_direct.py::test_only_the_maintainer_adds_and_never_after_close` |
| 3 | close: no maintainer check | `tests/test_direct.py::test_only_the_maintainer_closes` |
| 4 | create: the program is recorded as nobody's | `tests/test_direct.py::test_a_program_opens_with_its_first_funding` |
| 5 | fund: the funder is not recorded | `tests/test_direct.py::test_a_program_opens_with_its_first_funding` |
| 6 | judge: the caller is not recorded | `tests/test_direct.py::test_faithful_credits_the_rate_and_joins_the_export` |
| 7 | submit: anyone submits on someone else's claim | `tests/test_direct.py::test_submit_refusals` |
| 8 | submit: the claim holder compared as case-sensitive text | `tests/test_direct.py::test_an_approved_section_cannot_be_claimed_again` |
| 9 | submit: the submission is recorded as the slot's, not the caller's | `tests/test_direct.py::test_faithful_credits_the_rate_and_joins_the_export` |
| 10 | withdraw: pays a fixed address | `tests/test_direct.py::test_withdraw_pays_the_whole_balance_once` |
| 11 | close: pays a fixed address | `tests/test_direct.py::test_close_returns_the_unused_pool_to_the_maintainer` |
| 12 | claim: a claimed section can be claimed again | `tests/test_direct.py::test_a_claim_locks_one_section_in_one_language_for_48_hours_and_reserves_the_rate` |
| 13 | claim: an approved section can be claimed again | `tests/test_direct.py::test_an_approved_section_cannot_be_claimed_again` |
| 14 | claim: four claims at once | `tests/test_direct.py::test_a_translator_holds_at_most_three_claims` |
| 15 | claim: a barred translator claims again | `tests/test_direct.py::test_a_second_flawed_releases_the_claim_and_bars_that_translator_from_it` |
| 16 | claim: no pool check | `tests/test_direct.py::test_an_expired_claim_reopens_the_section_and_returns_its_reserve` |
| 17 | claim: the pool check ignores reservations | `tests/test_direct.py::test_an_expired_claim_reopens_the_section_and_returns_its_reserve` |
| 18 | claim: nothing is reserved | `tests/test_direct.py::test_a_claim_locks_one_section_in_one_language_for_48_hours_and_reserves_the_rate` |
| 19 | claim: lasts 49 hours | `tests/test_direct.py::test_a_claim_locks_one_section_in_one_language_for_48_hours_and_reserves_the_rate` |
| 20 | claim: open on a closed program | `tests/test_direct.py::test_no_claims_on_a_closed_program` |
| 21 | claim: a language the program does not translate into | `tests/test_direct.py::test_claim_refusals` |
| 22 | expiry: an expired claim never reopens | `tests/test_direct.py::test_a_translator_holds_at_most_three_claims` |
| 23 | expiry: a claim waiting for the judge expires too | `tests/test_direct.py::test_a_submission_waiting_for_the_judge_never_expires` |
| 24 | release: the reserve is not returned | `tests/test_direct.py::test_an_expired_claim_reopens_the_section_and_returns_its_reserve` |
| 25 | release: the translator keeps the claim on their list | `tests/test_direct.py::test_a_translator_holds_at_most_three_claims` |
| 26 | release: a verdict never bars | `tests/test_direct.py::test_a_second_flawed_releases_the_claim_and_bars_that_translator_from_it` |
| 27 | claim: the program never sweeps expired claims | `tests/test_direct.py::test_an_expired_claim_reopens_the_section_and_returns_its_reserve` |
| 28 | submit: open while the judge is pending | `tests/test_direct.py::test_a_passing_submission_waits_for_the_judge` |
| 29 | submit: open after the claim expired | `tests/test_direct.py::test_submit_refusals` |
| 30 | submit: no pre-check | `tests/test_direct.py::test_a_precheck_failure_is_stored_with_the_exact_difference_and_no_judge_runs` |
| 31 | submit: a pre-check failure still goes to the judge | `tests/test_direct.py::test_a_precheck_failure_is_stored_with_the_exact_difference_and_no_judge_runs` |
| 32 | submit: the 6250-character cap is gone | `tests/test_direct.py::test_submit_refusals` |
| 33 | add: the 2500-character cap is gone | `tests/test_direct.py::test_add_sections_refusals[texts4-longer` |
| 34 | add: 21 sections at a time | `tests/test_direct.py::test_add_sections_refusals[texts3-one` |
| 35 | add: 201 sections in a program | `tests/test_direct.py::test_a_program_holds_at_most_two_hundred_sections` |
| 36 | judge: a pre-check failure can be judged | `tests/test_direct.py::test_a_precheck_failure_is_stored_with_the_exact_difference_and_no_judge_runs` |
| 37 | judge: a submission is judged twice | `tests/test_direct.py::test_judge_refusals` |
| 38 | judge: FAITHFUL credits nothing | `tests/test_direct.py::test_faithful_credits_the_rate_and_joins_the_export` |
| 39 | judge: FAITHFUL leaves the pool untouched | `tests/test_direct.py::test_faithful_credits_the_rate_and_joins_the_export` |
| 40 | judge: FAITHFUL keeps the reserve | `tests/test_direct.py::test_faithful_credits_the_rate_and_joins_the_export` |
| 41 | judge: FAITHFUL does not approve the section | `tests/test_direct.py::test_an_approved_section_cannot_be_claimed_again` |
| 42 | judge: FAITHFUL keeps the claim live | `tests/test_direct.py::test_faithful_credits_the_rate_and_joins_the_export` |
| 43 | judge: FLAWED allows unlimited revisions | `tests/test_direct.py::test_a_second_flawed_releases_the_claim_and_bars_that_translator_from_it` |
| 44 | judge: FLAWED allows no revision | `tests/test_direct.py::test_flawed_allows_one_revision_within_the_claim` |
| 45 | judge: WRONG_LANGUAGE allows a revision | `tests/test_direct.py::test_wrong_language_releases_the_claim_at_once` |
| 46 | judge: the revision is not counted | `tests/test_direct.py::test_flawed_allows_one_revision_within_the_claim` |
| 47 | judge: validators agree with any answer | `tests/test_direct.py::test_a_disagreement_changes_nothing` |
| 48 | judge: validators compare the reason too | `tests/test_direct.py::test_validators_compare_the_verdict_and_never_the_reason` |
| 49 | judge: an unreadable verdict defaults to FLAWED | `tests/test_direct.py::test_an_unreadable_label_on_every_node_is_never_a_verdict` |
| 50 | judge: the reason is not capped | `tests/test_direct.py::test_the_reason_is_capped_and_kept_on_one_line` |
| 51 | judge: no retry on a formatting slip | `tests/test_direct.py::test_one_formatting_slip_is_retried_and_two_disagree` |
| 52 | prompt: the fence lets delimiters through | `tests/test_static.py::test_the_blocks_close_where_the_contract_closes_them[source]` |
| 53 | prompt: the translation reaches the prompt unfenced | `tests/test_static.py::test_every_prompt_value_is_fenced_or_owned_by_the_contract` |
| 54 | prompt: the source reaches the prompt unfenced | `tests/test_static.py::test_every_prompt_value_is_fenced_or_owned_by_the_contract` |
| 55 | prompt: a glossary rendering reaches the prompt unfenced | `tests/test_static.py::test_glossary_lines_fence_every_term_and_rendering` |
| 56 | prompt: every glossary term, whether in the section or not | `tests/test_direct.py::test_the_prompt_names_the_languages_and_only_the_glossary_terms_in_the_section` |
| 57 | prompt: the wrong language is named | `tests/test_direct.py::test_the_prompt_names_the_languages_and_only_the_glossary_terms_in_the_section` |
| 58 | precheck: Persian digits are not normalised | `tests/test_direct.py::test_persian_digits_pass_the_number_check` |
| 59 | precheck: numbers compared as a set, not a multiset | `tests/test_direct.py::test_a_precheck_failure_is_stored_with_the_exact_difference_and_no_judge_runs` |
| 60 | precheck: code blocks are not compared | `tests/test_direct.py::test_a_translated_code_block_is_caught_before_any_judge` |
| 61 | precheck: the code block count is not compared | `tests/test_precheck.py::test_the_contract_gives_the_same_answer[a` |
| 62 | precheck: inline code is not compared | `tests/test_precheck.py::test_the_contract_gives_the_same_answer[inline` |
| 63 | precheck: links are not compared | `tests/test_precheck.py::test_the_contract_gives_the_same_answer[a` |
| 64 | precheck: headings are not compared | `tests/test_precheck.py::test_the_contract_gives_the_same_answer[a` |
| 65 | precheck: the length ratio is not checked | `tests/test_precheck.py::test_the_contract_gives_the_same_answer[far` |
| 66 | precheck: trailing punctuation stays on a link | `tests/test_precheck.py::test_the_contract_gives_the_same_answer[a` |
| 67 | withdraw: the balance is not cleared | `tests/test_direct.py::test_withdraw_pays_the_whole_balance_once` |
| 68 | withdraw: a zero balance still sends | `tests/test_direct.py::test_withdraw_pays_the_whole_balance_once` |
| 69 | close: open claims do not block it | `tests/test_direct.py::test_close_waits_for_open_claims_and_sweeps_expired_ones` |
| 70 | close: closes twice | `tests/test_direct.py::test_close_returns_the_unused_pool_to_the_maintainer` |
| 71 | close: the pool is not emptied | `tests/test_direct.py::test_close_returns_the_unused_pool_to_the_maintainer` |
| 72 | close: the program stays open | `tests/test_direct.py::test_fund_refusals` |
| 73 | fund: zero value accepted | `tests/test_direct.py::test_fund_refusals` |
| 74 | fund: open on a closed program | `tests/test_direct.py::test_fund_refusals` |
| 75 | create: opens with no funding | `tests/test_direct.py::test_create_program_refusals[kwargs0-opens` |
| 76 | create: a rate of zero | `tests/test_direct.py::test_create_program_refusals[kwargs1-the` |
| 77 | create: the source as a target | `tests/test_direct.py::test_create_program_refusals[kwargs7-cannot` |
| 78 | create: nine target languages | `tests/test_direct.py::test_create_program_refusals[kwargs4-one` |
| 79 | glossary: a language outside the program | `tests/test_direct.py::test_create_program_refusals[kwargs17-does` |
| 80 | glossary: a term listed twice | `tests/test_direct.py::test_create_program_refusals[kwargs18-lists` |
