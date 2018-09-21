'use strict';

/**
 * UINamespace Sample Extension
 *
 * This is the popup extension portion of the UINamespace sample, please see
 * uiNamespace.js in addition to this for context.  This extension is
 * responsible for collecting configuration settings from the user and communicating
 * that info back to the parent extension.
 *
 * This sample demonstrates two ways to do that:
 *   1) The suggested and most common method is to store the information
 *      via the settings namespace.  The parent can subscribe to notifications when
 *      the settings are updated, and collect the new info accordingly.
 *   2) The popup extension can receive and send a string payload via the open
 *      and close payloads of initializeDialogAsync and closeDialog methods.  This is useful
 *      for information that does not need to be persisted into settings.
 */


// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
    /**
     * This extension collects the IDs of each datasource the user is interested in
     * and stores this information in settings when the popup is closed.
     */
    const playerSettingsKey = 'vbPlayerSettings';
    let playerSettings = {};

    $(document).ready(function () {
        // The only difference between an extension in a dashboard and an extension
        // running in a popup is that the popup extension must use the method
        // initializeDialogAsync instead of initializeAsync for initialization.
        // This has no affect on the development of the extension but is used internally.
        tableau.extensions.initializeDialogAsync().then(function (openPayload) {
            const initSettings = JSON.parse(openPayload);
            // The openPayload sent from the parent extension in this sample is the
            // default time interval for the refreshes.  This could alternatively be stored
            // in settings, but is used in this sample to demonstrate open and close payloads.
            $('#interval').val(5);
            $('#playerUrl').val(initSettings.playerUrl);
            $('#worksheetName').val(initSettings.worksheetName);
            $('#pathToFiles').val(initSettings.pathToFiles);
            $('#mediaColumnName').val(initSettings.mediaColumnName);
            $('#jsonColumnName').val(initSettings.jsonColumnName);
            $('#closeButton').click(closeDialog);
        });
    });

    function parsePlayerSettings() {
        let playerSettings = {};
        let settings = tableau.extensions.settings.getAll();
        if (settings[playerSettingsKey]) {
            playerSettings = JSON.parse(settings[playerSettingsKey]);
        }

        return playerSettings;
    }

    /**
     * Stores the selected datasource IDs in the extension settings,
     * closes the dialog, and sends a payload back to the parent.
     */
    function closeDialog() {
        const playerSettings = {
            playerUrl: $('#playerUrl').val(),
            worksheetName: $('#worksheetName').val(),
            pathToFiles: $('#pathToFiles').val(),
            mediaColumnName: $('#mediaColumnName').val(),
            jsonColumnName: $('#jsonColumnName').val()
        };

        let currentSettings = tableau.extensions.settings.getAll();
        tableau.extensions.settings.set(playerSettingsKey, JSON.stringify(playerSettings));

        tableau.extensions.settings.saveAsync().then((newSavedSettings) => {
            tableau.extensions.ui.closeDialog(JSON.stringify(playerSettings));
        });
    }
})();
