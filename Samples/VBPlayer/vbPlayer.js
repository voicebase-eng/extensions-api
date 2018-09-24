'use strict';

/**
 * UINamespace Sample Extension
 *
 * This sample extension demonstrates how to use the UI namespace
 * to create a popup dialog with additional UI that the user can interact with.
 * The content in this dialog is actually an extension as well (see the
 * uiNamespaceDialog.js for details).
 *
 * This sample is an extension that auto refreshes datasources in the background of
 * a dashboard.  The extension has little need to take up much dashboard space, except
 * when the user needs to adjust settings, so the UI namespace is used for that.
 */

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
    const defaultSettings = {
        playerUrl: 'http://localhost:8765/Samples/VBPlayer/player',
        worksheetName: 'Calls',
        pathToFiles: 'http://localhost:8765/Samples/VBPlayer/resources',
        mediaColumnName: 'ATTR(Media File)',
        jsonColumnName: 'ATTR(Json File)',
    };
    const playerSettingsKey = 'vbPlayerSettings';
    let playerSettings = {};
    let unregisterHandlerFunctions = [];

    $(document).ready(function () {
        // When initializing an extension, an optional object is passed that maps a special ID (which
        // must be 'configure') to a function.  This, in conjuction with adding the correct context menu
        // item to the manifest, will add a new "Configure..." context menu item to the zone of extension
        // inside a dashboard.  When that context menu item is clicked by the user, the function passed
        // here will be executed.
        tableau.extensions.initializeAsync({'configure': configure}).then(function() {
            // This event allows for the parent extension and popup extension to keep their
            // settings in sync.  This event will be triggered any time a setting is
            // changed for this extension, in the parent or popup (i.e. when settings.saveAsync is called).
            tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
                updateExtensionBasedOnSettings(settingsEvent.newSettings)
            });
        });
    });

    function configure() {
        // This uses the window.location.origin property to retrieve the scheme, hostname, and
        // port where the parent extension is currently running, so this string doesn't have
        // to be updated if the extension is deployed to a new location.
        const popupUrl = `${window.location.origin}/Samples/VBPlayer/vbPlayerDialog.html`;

        /**
         * This is the API call that actually displays the popup extension to the user.  The
         * popup is always a modal dialog.  The only required parameter is the URL of the popup,
         * which must be the same domain, port, and scheme as the parent extension.
         *
         * The developer can optionally control the initial size of the extension by passing in
         * an object with height and width properties.  The developer can also pass a string as the
         * 'initial' payload to the popup extension.  This payload is made available immediately to
         * the popup extension.  In this example, the value '5' is passed, which will serve as the
         * default interval of refresh.
         */
        tableau.extensions.ui.displayDialogAsync(popupUrl, JSON.stringify(defaultSettings), { height: 500, width: 500 }).then((closePayload) => {
            $('#inactive').hide();
        }).catch((error) => {
            // One expected error condition is when the popup is closed by the user (meaning the user
            // clicks the 'X' in the top right of the dialog).  This can be checked for like so:
            switch(error.errorCode) {
                case tableau.ErrorCodes.DialogClosedByUser:
                    console.log("Dialog was closed by user");
                    break;
                default:
                    console.error(error.message);
            }
        });
    }

    function fetchActiveMarks () {
        // Whenever we restore the filters table, remove all save handling functions,
        // since we add them back later in this function.
        unregisterHandlerFunctions.forEach(function (unregisterHandlerFunction) {
            unregisterHandlerFunction();
        });

        // Since filter info is attached to the worksheet, we will perform
        // one async call per worksheet to get every filter used in this
        // dashboard.  This demonstrates the use of Promise.all to combine
        // promises together and wait for each of them to resolve.
        let promises = [];

        // List of all filters in a dashboard.
        let dashboardActiveMarks = [];

        // To get filter info, first get the dashboard.
        const dashboard = tableau.extensions.dashboardContent.dashboard;

        // Then loop through each worksheet and get its filters, save promise for later.
        dashboard.worksheets.forEach(function (worksheet) {
            if(worksheet.name === playerSettings.worksheetName) {
                promises.push(worksheet.getHighlightedMarksAsync());

                // Add filter event to each worksheet.  AddEventListener returns a function that will
                // remove the event listener when called.
                let unregisterHandlerFunction = worksheet.addEventListener(
                    tableau.TableauEventType.MarkSelectionChanged,
                    fetchActiveMarks
                );
                unregisterHandlerFunctions.push(unregisterHandlerFunction);
            }
        });

        // Now, we call every filter fetch promise, and wait for all the results
        // to finish before displaying the results to the user.
        Promise.all(promises).then(function (results) {
            results.forEach(function (result) {
                result.data.forEach(function (dataTable) {
                    dashboardActiveMarks = dashboardActiveMarks.concat(dataTable);
                });
            });

            const leadingMark = dashboardActiveMarks.pop();
            if (leadingMark) {
                console.log(leadingMark);
                const playerData = leadingMark.columns.reduce((acc, column, i) => {
                    console.log(playerSettings.mediaColumnName, column.fieldName);
                    if (column.fieldName === playerSettings.mediaColumnName) {
                        return Object.assign(acc, { mediaName: leadingMark.data[0][i].value });
                    }

                    if (column.fieldName === playerSettings.jsonColumnName) {
                        return Object.assign(acc, { jsonName: leadingMark.data[0][i].value });
                    }

                    return acc;
                }, {});

                if(playerData.mediaName && playerData.jsonName) {
                    const mediaUrl = `${playerSettings.pathToFiles}/${playerData.mediaName}`;
                    const analyticsUrl = `${playerSettings.pathToFiles}/${playerData.jsonName}`;
                    const playerUrl = playerSettings.playerUrl;
                    const iframeUrl = `${playerUrl}#apiUrl=https://apis.voicebase.com/v3&analyticsFormat=ANALYTICS_SCHEMA_VERSION_V3&mediaUrl=${mediaUrl}&analyticsUrl=${analyticsUrl}`;
                    $('#active').html(`
                        <iframe
                            id="player"
                            src="${iframeUrl}"
                        ></iframe>
                    `).show();
                } else {
                    $('#active').html('No mark with media & json is selected').show();
                }
            } else {
                $('#active').html('').show();
            }
        });
    }

    /**
     * Helper that is called to set state anytime the settings are changed.
     */
    function updateExtensionBasedOnSettings(settings) {
        if (settings[playerSettingsKey]) {
            playerSettings = JSON.parse(settings[playerSettingsKey]);
            fetchActiveMarks();
        }
    }
})();
