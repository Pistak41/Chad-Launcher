/**
 * Script for welcome.ejs
 */
document.getElementById('welcomeButton').addEventListener('click', () => {
    // loginOptionsCancelEnabled(false) // False by default, be explicit.
    // loginOptionsViewOnLoginSuccess = VIEWS.landing
    // loginOptionsViewOnLoginCancel = VIEWS.login
    switchView(VIEWS.welcome, VIEWS.login)
})