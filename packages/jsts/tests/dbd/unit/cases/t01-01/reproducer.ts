import { runTest } from '../../test';

const code = `const window = {
    watchMedia: () => {
        return "(min-device-width: 992px)";
    }
}

window.watchMedia();
`;

runTest('t01-01', code);

/**
 * bb1:
 *   #8 = call #new-object#():foo
 *   #9 = call #new-object#():foo
 *   #10 = call #set-field# watchMedia(#9, null#-1):foo
 *   #11 = call #set-field# window(#8, #9):foo
 *   #12 = call #new-object#():foo
 *   #13 = call #new-object#():foo
 *   #14 = call #set-field# ui(#12, #13):foo
 *   #15 = call #new-object#():foo
 *   #16 = call #new-object#():foo
 *   #17 = call #set-field# user(#15, #16):foo
 *   #18 = call #set-field# boot(#12, #15):foo
 *   #19 = call #new-object#():foo
 *   #20 = call #set-field# current_route(#19, #6):foo
 *   #21 = call #set-field# router(#12, #19):foo
 *   #22 = call #set-field# frappe(#8, #12):foo
 *   #23 = call #get-field# frappe(#8):foo
 *   #24 = call #get-field# ui(#23):foo
 *   #25 = call #get-field# init_onboarding_tour(#24):foo
 *   // the assignment
 *   // declare #26 as a constant of type Function
 *   #27 = call #set-field" init_onboarding_tour(#26,#24):foo
 *   // the function call itself
 *   #28 = call #get-field# init_onboarding_tour(#24) // we get the constant
 *   // we use the constant value to execute the actual call
 *   #28 = call _home_eric_morand_Projects_js-advanced-analysis_code-samples_TypeError_T01_Cannot_read_properties_of_undefined_T01-01_reproducer_js.init_onboarding_tour():foo
 *   return null#-1
 */
