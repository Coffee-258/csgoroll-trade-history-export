// ==UserScript==
// @name            roll-bot
// @include         *csgoroll.*/trades
// @run-at          document-start
// @grant           none
// @icon            https://www.google.com/s2/favicons?sz=64&domain=csgoroll.com
// @require         http://code.jquery.com/jquery-3.4.1.min.js
// @author          coffee
// ==/UserScript==
/* global $ */

let trades = [];

$(document).ready(function () {
    $("body").append(`
        <style>
            dialog::backdrop {
                background-color: rgba(0,0,0,0.5);
            }

            .white-bold {
                color: white;
                font-weight: bold;
            }

            .table {
                display: table;
                width: 100%;
            }

            .table-row {
                display: table-row;
                width: 100%;
            }

            .table-cell {
                display:table-cell;
                width: 50%;
            }

            .table-cell input {
                margin-bottom: 10px;
                width: 100%;
                text-align: right;
            }

            .input-export {
                border: 1px solid rgba(0, 0, 0, 0.3);
                border-radius: 3px;
                background-color: rgba(0, 0, 0, 0.3);
                color: white;
            }

            .table-cell button {
                width: calc(100% - 5px);
            }

            .table-cell:first-child button {
                margin-right: 5px;
            }

            .table-cell:last-child button {
                margin-left: 5px;
            }

            #export-progress-bar {
                width: 100%;
                height: 5px;
                display: block;
            }

            #export-progress-bar div {
                height: 100%;
                width: 0px;
                background-color: #00c74d;
                transition: 200ms;
            }

            dialog h4 {
                margin-bottom: 25px;
            }

            #export-dialog {
                width: 430px;
                top: 0px;
                background-color: var(--mat-sidenav-content-background-color);
                z-index: 10;
                border-radius: 5px;
                margin: auto;
                padding: 20px;
                border: none;
                bottom: 0px;
            }
        </style>
    `);

    setTimeout(function () {
        $("body").append(`<dialog id="export-dialog">
                <h4>Export trade history</h4>
                <div class="table">
                    <div class="table-row">
                        <div class="table-cell">
                            <span class="white-bold">Size</span>
                        </div>
                        <div class="table-cell">
                            <input id="input-export-size" class="input-export" value="1000">
                        </div>
                    </div>
                </div>
                <div id="export-progress-bar"><div></div></div>
                <div class="table" style="margin-top: 10px;">
                    <div class="table-row">
                        <div class="table-cell">
                            <button color="accent" id="export-start" class="mat-focus-indicator mat-button-3d mat-flat-button mat-button-base mat-accent">
                                <span class="mat-button-wrapper"> Load </span>
                                <span matripple="" class="mat-ripple mat-button-ripple"></span>
                                <span class="mat-button-focus-overlay"></span>
                            </button>
                        </div>
                        <div class="table-cell">
                            <button color="accent" id="export-download" class="mat-focus-indicator mat-button-3d mat-flat-button mat-button-base mat-accent">
                                <span class="mat-button-wrapper"> Download </span>
                                <span matripple="" class="mat-ripple mat-button-ripple"></span>
                                <span class="mat-button-focus-overlay"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </dialog>
            `);

        $("button[data-test='filter']").parent().prepend(`
            <button color="accent" id="export-history" style="margin-right: 15px;" class="mat-focus-indicator mat-button-3d mat-flat-button mat-button-base mat-accent">
            <span class="mat-button-wrapper"> Export </span>
            <span matripple="" class="mat-ripple mat-button-ripple"></span>
            <span class="mat-button-focus-overlay"></span>
        </button>`);

        $("#export-history").click(function () {
            $("#export-dialog")[0].showModal();
        });

        $("#export-download").click(function () {
            if (trades.length == 0) {
                alert("Please load trade history first");
                return;
            }
            downloadObjectAsJson(trades, "trades");
        });

        $("#export-start").click(function () {
            let size = $("#input-export-size").val();

            $("#export-progress-bar div").css({ 'width': '0%' });

            trades = [];

            getData(size, 0);
        });

        var dialog = document.getElementById('export-dialog');

        dialog.addEventListener('click', function (event) {
            var rect = dialog.getBoundingClientRect();
            var isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
            if (!isInDialog) {
                dialog.close();
            }
        });
    }, 3000);

});

function downloadObjectAsJson(exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function getData(size, progress, cursor) {
    let _s = (size - progress) > 200 ? 200 : (size - progress);

    progress += _s;

    let variables = {
        first: _s,
        userId: window.location.href.split("/player/")[1].split("/")[0],
        orderBy: "CREATED_AT_DESC",
        statuses: ["COMPLETED"],
        after: cursor
    }

    let extensions = {
        persistedQuery: {
            version: 1,
            sha256Hash: "3331478704f0290a1cfde30b387d62c8f5b264d3b353b778498e91abbf3d449b"
        }
    };

    $.ajax({
        url: decodeGraphqlUrl('TradeTable', variables, extensions),
        xhrFields: {
            withCredentials: true
        }
    }).done(function (data) {
        console.log(data);

        let d = data.data;

        if (d != null) {
            let cursor = d.trades.pageInfo.endCursor

            for (let trade of d.trades.edges) {
                let t = trade.node;
                trades.push(t);
            }

            $("#export-progress-bar div").css({ 'width': (100 * progress / size) + '%' });

            if (size > progress) {
                console.log(size, progress);
                getData(size, progress, cursor);
            }
        }
    });
}

function decodeGraphqlUrl(operationName, variables, extensions) {
    return 'https://api.csgoroll.gg/graphql?operationName=' + operationName + '&variables=' + encodeURIComponent(JSON.stringify(variables))
        + '&extensions=' + encodeURIComponent(JSON.stringify(extensions));
}