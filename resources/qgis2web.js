
var map = new ol.Map({
    target: 'map',
    renderer: 'canvas',
    layers: layersList,
    view: new ol.View({
        constrainResolution: false,
        maxZoom: 28,
        minZoom: 1,
        
    })
});

//initial view - epsg:3857 coordinates if not "Match project CRS"
map.getView().fit([-145615.508027, 7239727.118918, -139247.545583, 7246829.114175], map.getSize());

//change cursor
function pointerOnFeature(evt) {
    if (evt.dragging) {
        return;
    }
    var hasFeature = map.hasFeatureAtPixel(evt.pixel, {
        layerFilter: function(layer) {
            return layer && (layer.get("interactive"));
        }
    });
    map.getViewport().style.cursor = hasFeature ? "pointer" : "";
}
map.on('pointermove', pointerOnFeature);
function styleCursorMove() {
    map.on('pointerdrag', function() {
        map.getViewport().style.cursor = "move";
    });
    map.on('pointerup', function() {
        map.getViewport().style.cursor = "default";
    });
}
styleCursorMove();

////small screen definition
    var hasTouchScreen = map.getViewport().classList.contains('ol-touch');
    var isSmallScreen = window.innerWidth < 650;

////controls container

    //top left container
    var topLeftContainer = new ol.control.Control({
        element: (() => {
            var topLeftContainer = document.createElement('div');
            topLeftContainer.id = 'top-left-container';
            return topLeftContainer;
        })(),
    });
    map.addControl(topLeftContainer)

    //bottom left container
    var bottomLeftContainer = new ol.control.Control({
        element: (() => {
            var bottomLeftContainer = document.createElement('div');
            bottomLeftContainer.id = 'bottom-left-container';
            return bottomLeftContainer;
        })(),
    });
    map.addControl(bottomLeftContainer)
  
    //top right container
    var topRightContainer = new ol.control.Control({
        element: (() => {
            var topRightContainer = document.createElement('div');
            topRightContainer.id = 'top-right-container';
            return topRightContainer;
        })(),
    });
    map.addControl(topRightContainer)

    //bottom right container
    var bottomRightContainer = new ol.control.Control({
        element: (() => {
            var bottomRightContainer = document.createElement('div');
            bottomRightContainer.id = 'bottom-right-container';
            return bottomRightContainer;
        })(),
    });
    map.addControl(bottomRightContainer)

//popup
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');
var sketch;

function stopMediaInPopup() {
    var mediaElements = container.querySelectorAll('audio, video');
    mediaElements.forEach(function(media) {
        media.pause();
        media.currentTime = 0;
    });
}
closer.onclick = function() {
    container.style.display = 'none';
    closer.blur();
    stopMediaInPopup();
    return false;
};
var overlayPopup = new ol.Overlay({
    element: container,
	autoPan: true
});
map.addOverlay(overlayPopup)
    
    
var NO_POPUP = 0
var ALL_FIELDS = 1

/**
 * Returns either NO_POPUP, ALL_FIELDS or the name of a single field to use for
 * a given layer
 * @param layerList {Array} List of ol.Layer instances
 * @param layer {ol.Layer} Layer to find field info about
 */
function getPopupFields(layerList, layer) {
    // Determine the index that the layer will have in the popupLayers Array,
    // if the layersList contains more items than popupLayers then we need to
    // adjust the index to take into account the base maps group
    var idx = layersList.indexOf(layer) - (layersList.length - popupLayers.length);
    return popupLayers[idx];
}

//highligth collection
var collection = new ol.Collection();
var featureOverlay = new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: collection,
        useSpatialIndex: false // optional, might improve performance
    }),
    style: [new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#f00',
            width: 1
        }),
        fill: new ol.style.Fill({
            color: 'rgba(255,0,0,0.1)'
        }),
    })],
    updateWhileAnimating: true, // optional, for instant visual feedback
    updateWhileInteracting: true // optional, for instant visual feedback
});

var doHighlight = false;
var doHover = false;

function createPopupField(currentFeature, currentFeatureKeys, layer) {
    var popupText = '';
    for (var i = 0; i < currentFeatureKeys.length; i++) {
        if (currentFeatureKeys[i] != 'geometry' &&
            currentFeatureKeys[i] != 'layerObject' &&
            currentFeatureKeys[i] != 'idO' &&
            currentFeatureKeys[i] != '_mvtLayer_') {
            var popupField = '';
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "hidden field") {
                continue;
            } else if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "inline label - visible with data") {
                if (currentFeature.get(currentFeatureKeys[i]) == null) {
                    continue;
                }
            }
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "inline label - always visible" ||
                layer.get('fieldLabels')[currentFeatureKeys[i]] == "inline label - visible with data") {
                popupField += '<th>' + layer.get('fieldAliases')[currentFeatureKeys[i]] + '</th><td>';
            } else {
                popupField += '<td colspan="2">';
            }
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "header label - visible with data") {
                if (currentFeature.get(currentFeatureKeys[i]) == null) {
                    continue;
                }
            }
            if (layer.get('fieldLabels')[currentFeatureKeys[i]] == "header label - always visible" ||
                layer.get('fieldLabels')[currentFeatureKeys[i]] == "header label - visible with data") {
                popupField += '<strong>' + layer.get('fieldAliases')[currentFeatureKeys[i]] + '</strong><br />';
            }
            if (layer.get('fieldImages')[currentFeatureKeys[i]] != "ExternalResource") {
				popupField += (currentFeature.get(currentFeatureKeys[i]) != null ? autolinker.link(currentFeature.get(currentFeatureKeys[i]).toLocaleString()) + '</td>' : '');
			} else {
				var fieldValue = currentFeature.get(currentFeatureKeys[i]);
				if (/\.(gif|jpg|jpeg|tif|tiff|png|avif|webp|svg)$/i.test(fieldValue)) {
					popupField += (fieldValue != null ? '<img src="images/' + fieldValue.replace(/[\\\/:]/g, '_').trim() + '" /></td>' : '');
				} else if (/\.(mp4|webm|ogg|avi|mov|flv)$/i.test(fieldValue)) {
					popupField += (fieldValue != null ? '<video controls><source src="images/' + fieldValue.replace(/[\\\/:]/g, '_').trim() + '" type="video/mp4">Il tuo browser non supporta il tag video.</video></td>' : '');
				} else if (/\.(mp3|wav|ogg|aac|flac)$/i.test(fieldValue)) {
                    popupField += (fieldValue != null ? '<audio controls><source src="images/' + fieldValue.replace(/[\\\/:]/g, '_').trim() + '" type="audio/mpeg">Il tuo browser non supporta il tag audio.</audio></td>' : '');
                } else {
					popupField += (fieldValue != null ? autolinker.link(fieldValue.toLocaleString()) + '</td>' : '');
				}
			}
            popupText += '<tr>' + popupField + '</tr>';
        }
    }
    return popupText;
}

var highlight;
var autolinker = new Autolinker({truncate: {length: 30, location: 'smart'}});

function onPointerMove(evt) {
    if (!doHover && !doHighlight) {
        return;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    var coord = evt.coordinate;
    var currentFeature;
    var currentLayer;
    var currentFeatureKeys;
    var clusteredFeatures;
    var clusterLength;
    var popupText = '<ul>';

    // Collect all features and their layers at the pixel
    var featuresAndLayers = [];
    map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (layer && feature instanceof ol.Feature && (layer.get("interactive") || layer.get("interactive") === undefined)) {
            featuresAndLayers.push({ feature, layer });
        }
    });

    // Iterate over the features and layers in reverse order
    for (var i = featuresAndLayers.length - 1; i >= 0; i--) {
        var feature = featuresAndLayers[i].feature;
        var layer = featuresAndLayers[i].layer;
        var doPopup = false;
        for (k in layer.get('fieldImages')) {
            if (layer.get('fieldImages')[k] != "Hidden") {
                doPopup = true;
            }
        }
        currentFeature = feature;
        currentLayer = layer;
        clusteredFeatures = feature.get("features");
        if (clusteredFeatures) {
            clusterLength = clusteredFeatures.length;
        }
        if (typeof clusteredFeatures !== "undefined") {
            if (doPopup) {
                for(var n=0; n<clusteredFeatures.length; n++) {
                    currentFeature = clusteredFeatures[n];
                    currentFeatureKeys = currentFeature.getKeys();
                    popupText += '<li><table>'
                    popupText += '<a>' + '<b>' + layer.get('popuplayertitle') + '</b>' + '</a>';
                    popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                    popupText += '</table></li>';    
                }
            }
        } else {
            currentFeatureKeys = currentFeature.getKeys();
            if (doPopup) {
                popupText += '<li><table>';
                popupText += '<a>' + '<b>' + layer.get('popuplayertitle') + '</b>' + '</a>';
                popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                popupText += '</table></li>';
            }
        }
    }

    if (popupText == '<ul>') {
        popupText = '';
    } else {
        popupText += '</ul>';
    }
    
	if (doHighlight) {
        if (currentFeature !== highlight) {
            if (highlight) {
                featureOverlay.getSource().removeFeature(highlight);
            }
            if (currentFeature) {
                var featureStyle
                if (typeof clusteredFeatures == "undefined") {
					var style = currentLayer.getStyle();
					var styleFunction = typeof style === 'function' ? style : function() { return style; };
					featureStyle = styleFunction(currentFeature)[0];
				} else {
					featureStyle = currentLayer.getStyle().toString();
				}

                if (currentFeature.getGeometry().getType() == 'Point' || currentFeature.getGeometry().getType() == 'MultiPoint') {
                    var radius
					if (typeof clusteredFeatures == "undefined") {
						radius = featureStyle.getImage().getRadius();
					} else {
						radius = parseFloat(featureStyle.split('radius')[1].split(' ')[1]) + clusterLength;
					}

                    highlightStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({
                                color: "rgba(255, 255, 0, 1.00)"
                            }),
                            radius: radius
                        })
                    })
                } else if (currentFeature.getGeometry().getType() == 'LineString' || currentFeature.getGeometry().getType() == 'MultiLineString') {

                    var featureWidth = featureStyle.getStroke().getWidth();

                    highlightStyle = new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'rgba(255, 255, 0, 1.00)',
                            lineDash: null,
                            width: featureWidth
                        })
                    });

                } else {
                    highlightStyle = new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 0, 1.00)'
                        })
                    })
                }
                featureOverlay.getSource().addFeature(currentFeature);
                featureOverlay.setStyle(highlightStyle);
            }
            highlight = currentFeature;
        }
    }

    if (doHover) {
        if (popupText) {
			content.innerHTML = popupText;
            container.style.display = 'block';
            overlayPopup.setPosition(coord);
        } else {
            container.style.display = 'none';
            closer.blur();
        }
    }
};

map.on('pointermove', onPointerMove);

var popupContent = '';
var popupCoord = null;
var featuresPopupActive = false;

function updatePopup() {
    if (popupContent) {
        content.innerHTML = popupContent;
        container.style.display = 'block';
		overlayPopup.setPosition(popupCoord);
    } else {
        container.style.display = 'none';
        closer.blur();
        stopMediaInPopup();
    }
} 

function onSingleClickFeatures(evt) {
    if (doHover || sketch) {
        return;
    }
    if (!featuresPopupActive) {
        featuresPopupActive = true;
    }
    var pixel = map.getEventPixel(evt.originalEvent);
    var coord = evt.coordinate;
    var currentFeature;
    var currentFeatureKeys;
    var clusteredFeatures;
    var popupText = '<ul>';
    
    map.forEachFeatureAtPixel(pixel, function(feature, layer) {
        if (layer && feature instanceof ol.Feature && (layer.get("interactive") || layer.get("interactive") === undefined)) {
            var doPopup = false;
            for (var k in layer.get('fieldImages')) {
                if (layer.get('fieldImages')[k] !== "Hidden") {
                    doPopup = true;
                }
            }
            currentFeature = feature;
            clusteredFeatures = feature.get("features");
            if (typeof clusteredFeatures !== "undefined") {
                if (doPopup) {
                    for(var n = 0; n < clusteredFeatures.length; n++) {
                        currentFeature = clusteredFeatures[n];
                        currentFeatureKeys = currentFeature.getKeys();
                        popupText += '<li><table>';
                        popupText += '<a><b>' + layer.get('popuplayertitle') + '</b></a>';
                        popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                        popupText += '</table></li>';    
                    }
                }
            } else {
                currentFeatureKeys = currentFeature.getKeys();
                if (doPopup) {
                    popupText += '<li><table>';
                    popupText += '<a><b>' + layer.get('popuplayertitle') + '</b></a>';
                    popupText += createPopupField(currentFeature, currentFeatureKeys, layer);
                    popupText += '</table>';
                }
            }
        }
    });
    if (popupText === '<ul>') {
        popupText = '';
    } else {
        popupText += '</ul>';
    }
	
	popupContent = popupText;
    popupCoord = coord;
    updatePopup();
}

function onSingleClickWMS(evt) {
    if (doHover || sketch) {
        return;
    }
    if (!featuresPopupActive) {
        popupContent = '';
    }
    var coord = evt.coordinate;
    var viewProjection = map.getView().getProjection();
    var viewResolution = map.getView().getResolution();

    for (var i = 0; i < wms_layers.length; i++) {
        if (wms_layers[i][1] && wms_layers[i][0].getVisible()) {
            var url = wms_layers[i][0].getSource().getFeatureInfoUrl(
                evt.coordinate, viewResolution, viewProjection, {
                    'INFO_FORMAT': 'text/html',
                });
            if (url) {
                const wmsTitle = wms_layers[i][0].get('popuplayertitle');
                var ldsRoller = '<div class="roller-switcher" style="height: 25px; width: 25px;"></div>';

                popupCoord = coord;
                popupContent += ldsRoller;
                updatePopup();

                var timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error('Timeout exceeded'));
                    }, 5000); // (5 second)
                });

                // Function to try fetch with different option
                function tryFetch(urls) {
                    if (urls.length === 0) {
                        return Promise.reject(new Error('All fetch attempts failed'));
                    }
                    return fetch(urls[0])
                        .then((response) => {
                            if (response.ok) {
                                return response.text();
                            } else {
                                throw new Error('Fetch failed');
                            }
                        })
                        .catch(() => tryFetch(urls.slice(1))); // Try next URL
                }

                // List of URLs to try
                // The first URL is the original, the second is the encoded version, and the third is the proxy
                const urlsToTry = [
                    url,
                    encodeURIComponent(url),
                    'https://api.allorigins.win/raw?url=' + encodeURIComponent(url)
                ];

                Promise.race([tryFetch(urlsToTry), timeoutPromise])
                    .then((html) => {
                        if (html.indexOf('<table') !== -1) {
                            popupContent += '<a><b>' + wmsTitle + '</b></a>';
                            popupContent += html + '<p></p>';
                            updatePopup();
                        }
                    })
                    .finally(() => {
                        setTimeout(() => {
                            var loaderIcon = document.querySelector('.roller-switcher');
                            if (loaderIcon) loaderIcon.remove();
                        }, 500); // (0.5 second)
                    });
            }
        }
    }
}

map.on('singleclick', onSingleClickFeatures);
map.on('singleclick', onSingleClickWMS);

//get container
var topLeftContainerDiv = document.getElementById('top-left-container')
var bottomLeftContainerDiv = document.getElementById('bottom-left-container')
var topRightContainerDiv = document.getElementById('top-right-container')
var bottomRightContainerDiv = document.getElementById('bottom-right-container')

//title

//abstract

var Abstract = new ol.control.Control({
    element: (() => {
        var titleElement = document.createElement('div');
        titleElement.className = 'top-left-abstract ol-control';
        titleElement.id = 'abstract';

        var linkElement = document.createElement('a');

        if (8375 > 240) {
            linkElement.setAttribute("onmouseenter", "showAbstract()");
            linkElement.setAttribute("onmouseleave", "hideAbstract()");
            linkElement.innerHTML = 'i';

            window.hideAbstract = function() {
                linkElement.classList.add("project-abstract");
                linkElement.classList.remove("project-abstract-uncollapsed");
                linkElement.innerHTML = 'i';
            }

            window.showAbstract = function() {
                linkElement.classList.remove("project-abstract");
                linkElement.classList.add("project-abstract-uncollapsed");
                linkElement.innerHTML = 'Proposed Installation of  10m “Light Pole” on The Village Green near 4 Greenbank Terrace, North End, Hutton Rudby <br />Quickline Communications Notice Date:  16/11/26 <br />  <br />Dear Sir, <br />Rudby Parish Council writes as the landowner of the Registered Village Green in Hutton Rudby. Your proposed development to permanently install a “Light Pole” is shown on the notice in a position located on the Village Green and within the Hutton Rudby Conservation Area, the character and appearance of which would be adversely affected by the proposed development. <br />It is noted that Quickline has not approached Rudby Parish Council (as the landowner and occupier of the proposed site) to seek a wayleave agreement for the proposed installation.  <br />It is also noted that Quickline’s has installed Fibre to the Premises throughout much of the village using underground cabling / ducting.  Rudby Parish Council’s opinion is that the technical feasibility and economic viability of underground installation cannot reasonably be in doubt because Quickline has recently installed underground service lines in other locations around the Village Green and throughout the village.  <br />The Parish Council is disappointed to see a proposal for a pole and associated overhead cabling being put forward in the most visually sensitive part of the village.  Underground cabling is the Parish Council’s preferred solution. <br />  <br />Content of the notice <br />The notice states that Quickline is “intending to notify North Yorkshire Council [Planning Department] that it is intending to install a pole(s) pursuant to the Town and Country Planning (General Permitted Development) Order 2016 (amended) (England) and the Electronic Communications Code (conditions and restrictions) Regulations 2003 (as amended)”. <br />Under prior notification procedures, as a statutory consultee we would expect to be invited to comment by the Planning Authority shortly after they have received and validated your notification.  We have not received any such invitation from North Yorkshire Council, and a prior notice for your proposed work is not yet showing on the planning portal of your notification. <br />Please clarify whether you have notified North Yorkshire Council and if you have done so when the notification was submitted. <br />Consequences of wilful harm to a Village Green <br />Registered Village Greens are subject to various statutory protections arising from the Inclosure Act 1857, the Commons Act 1876 and other subsequent legislation.   The Village Green is not part of an adopted highway.  Rights which Quickline may have in relation to highways and associated verges do not apply to any part of the Village Green. Wilfully causing harm to a Village Green is a summary offence under the Inclosure Act. The Parish Council’s opinion is that implementing the proposed works would be an act of wilful harm. <br />Please be advised that no works of any kind may be performed by Quickline on the Village Green without the express written permission of Rudby Parish Council.  Our permission is required for any activity which breaks the surface of the ground including but not limited to installation of stakes to hold notices and to the proposed installation of a pole.  It is further noted that rights available to the Parish Council under the Inclosure Act include the removal and sale of any such material installed without authorisation. <br />Street Works Rights do not apply to this proposal. <br />Part 8, Schedule 3A to the Communications Act 2003 deals with CONFERRAL OF STREET WORK RIGHTS AND THEIR EXERCISE <br />Paragraph 57 gives the definition of street: <br /> “street” means a street in England and Wales which is a maintainable highway (within the meaning of Part 3 of New Roads and Street Works Act 1991) <br />Paragraph 58 sets out the right which provide powers enabling the installation of poles on a street <br />(1) For the purposes of this code a “street work right”, in relation to an operator, is— <br />(a) a right to install and keep electronic communications apparatus in, on, under, over, along or across a street or a road; <br />The Village Green is not a maintainable highway which means it is not a street as defined in paragraph 57, therefore, paragraph 58 is not engaged.  Consequently, the proposed works cannot be performed under street works rights conferred on operators by the Communications Act 2003. <br />Code Rights do not apply without the site occupier’s agreement <br />Paragraph 9, Part 2, Schedule 3A to the Communications Act 2003 (the Electronic Communications Code, as inserted by the Digital Economy Act 2017) states: <br />  <br />"A code right in respect of land may only be conferred on an operator by an agreement between the occupier of the land and the operator." <br />  <br />Within the meaning of the Communications Act, Rudby Parish Council is the occupier of the land on which Quickline proposes to install poles.  No wayleave between Quickline and Rudby Parish Council for the proposed development exists or has been requested (although Quickline’s contractors have sought authorisation from the Parish Council for temporary excavations elsewhere, permission for which has been granted).  No order has been issued by the Upper Tribunal (Lands Chamber) to impose an agreement.  Furthermore, Rudby Parish Council has not been notified of any application to the Tribunal. <br />As no agreement exists, Quickline currently has no Code Right for the proposed development. <br />   <br />Permitted Development Rights rely on Code Rights or control of land <br />The Quickline notice states an intention to use the General Permitted Development Order (GPDO) to obtain planning consent.   Rudby Parish Council understands the proposed mechanism would be Part 16 Class A which defines Permitted Development as: <br />A. Development by or on behalf of an electronic communications code operator for the purpose of the operator’s electronic communications network in, on, over or under land controlled by that operator or in accordance with the electronic communications code, consisting of— <br />(a) the installation, alteration or replacement of any electronic communications apparatus, <br />Class A is only engaged when a development proposal meets one of two tests: 1) it relates to “land controlled by that operator”; or 2) the proposal is “in accordance with the electronic communications code”.  <br />Quickline does not own, lease or have a wayleave for the land on which it proposes the development. Hence, the land cannot in any sense be deemed as “land controlled by that operator”.  The first test fails. <br />For the reasons set out in more detail above, the proposed locations are not on streets and there is no wayleave, hence neither Code Rights nor Street Works Rights apply to the proposed development.  The proposed development is, therefore, not “in accordance with the electronic communications code”, hence the second test also fails. <br />Planning consent cannot be obtained under Part 16, Class A unless and until Quickline either acquire a Code Right for the development or control of the land neither of which it currently has. <br />Rudby Parish Council acknowledges that a full planning application could be submitted by Quickline, but doing so would first require that you serve notice on Rudby Parish Council as the landowner.  We have received no such notice. <br />Summary <br />This letter focuses on issues related to Code Rights, Street Works Rights, land ownership and occupation, and planning procedures.  For the reasons set out above, it is our opinion that the Quickline proposal is fundamentally flawed on both a procedural and legal basis.  Even if planning consent could be obtained by GPDO, it is our opinion that Quickline currently has no lawful basis to actually carry out the proposed installation on our land. <br />We will address our grounds of objection in terms of material planning considerations separately at the appropriate time.  In broad terms these relate to harms caused to the character and appearance of the Conservation Area and harms caused to the Village Green. <br />Rudby Parish Council requests that Quickline constructively engages with us so that a better way forward for this important infrastructure upgrade can be agreed and brought forward. <br />Rudby Parish Council requests that Openreach confirms in writing by 30th November 2026 that it will not commence any installation work until the issues raised in this letter have been resolved to our satisfaction. ';
            }

            hideAbstract();
        } else {
            linkElement.classList.add("project-abstract-uncollapsed");
            linkElement.innerHTML = 'Proposed Installation of  10m “Light Pole” on The Village Green near 4 Greenbank Terrace, North End, Hutton Rudby <br />Quickline Communications Notice Date:  16/11/26 <br />  <br />Dear Sir, <br />Rudby Parish Council writes as the landowner of the Registered Village Green in Hutton Rudby. Your proposed development to permanently install a “Light Pole” is shown on the notice in a position located on the Village Green and within the Hutton Rudby Conservation Area, the character and appearance of which would be adversely affected by the proposed development. <br />It is noted that Quickline has not approached Rudby Parish Council (as the landowner and occupier of the proposed site) to seek a wayleave agreement for the proposed installation.  <br />It is also noted that Quickline’s has installed Fibre to the Premises throughout much of the village using underground cabling / ducting.  Rudby Parish Council’s opinion is that the technical feasibility and economic viability of underground installation cannot reasonably be in doubt because Quickline has recently installed underground service lines in other locations around the Village Green and throughout the village.  <br />The Parish Council is disappointed to see a proposal for a pole and associated overhead cabling being put forward in the most visually sensitive part of the village.  Underground cabling is the Parish Council’s preferred solution. <br />  <br />Content of the notice <br />The notice states that Quickline is “intending to notify North Yorkshire Council [Planning Department] that it is intending to install a pole(s) pursuant to the Town and Country Planning (General Permitted Development) Order 2016 (amended) (England) and the Electronic Communications Code (conditions and restrictions) Regulations 2003 (as amended)”. <br />Under prior notification procedures, as a statutory consultee we would expect to be invited to comment by the Planning Authority shortly after they have received and validated your notification.  We have not received any such invitation from North Yorkshire Council, and a prior notice for your proposed work is not yet showing on the planning portal of your notification. <br />Please clarify whether you have notified North Yorkshire Council and if you have done so when the notification was submitted. <br />Consequences of wilful harm to a Village Green <br />Registered Village Greens are subject to various statutory protections arising from the Inclosure Act 1857, the Commons Act 1876 and other subsequent legislation.   The Village Green is not part of an adopted highway.  Rights which Quickline may have in relation to highways and associated verges do not apply to any part of the Village Green. Wilfully causing harm to a Village Green is a summary offence under the Inclosure Act. The Parish Council’s opinion is that implementing the proposed works would be an act of wilful harm. <br />Please be advised that no works of any kind may be performed by Quickline on the Village Green without the express written permission of Rudby Parish Council.  Our permission is required for any activity which breaks the surface of the ground including but not limited to installation of stakes to hold notices and to the proposed installation of a pole.  It is further noted that rights available to the Parish Council under the Inclosure Act include the removal and sale of any such material installed without authorisation. <br />Street Works Rights do not apply to this proposal. <br />Part 8, Schedule 3A to the Communications Act 2003 deals with CONFERRAL OF STREET WORK RIGHTS AND THEIR EXERCISE <br />Paragraph 57 gives the definition of street: <br /> “street” means a street in England and Wales which is a maintainable highway (within the meaning of Part 3 of New Roads and Street Works Act 1991) <br />Paragraph 58 sets out the right which provide powers enabling the installation of poles on a street <br />(1) For the purposes of this code a “street work right”, in relation to an operator, is— <br />(a) a right to install and keep electronic communications apparatus in, on, under, over, along or across a street or a road; <br />The Village Green is not a maintainable highway which means it is not a street as defined in paragraph 57, therefore, paragraph 58 is not engaged.  Consequently, the proposed works cannot be performed under street works rights conferred on operators by the Communications Act 2003. <br />Code Rights do not apply without the site occupier’s agreement <br />Paragraph 9, Part 2, Schedule 3A to the Communications Act 2003 (the Electronic Communications Code, as inserted by the Digital Economy Act 2017) states: <br />  <br />"A code right in respect of land may only be conferred on an operator by an agreement between the occupier of the land and the operator." <br />  <br />Within the meaning of the Communications Act, Rudby Parish Council is the occupier of the land on which Quickline proposes to install poles.  No wayleave between Quickline and Rudby Parish Council for the proposed development exists or has been requested (although Quickline’s contractors have sought authorisation from the Parish Council for temporary excavations elsewhere, permission for which has been granted).  No order has been issued by the Upper Tribunal (Lands Chamber) to impose an agreement.  Furthermore, Rudby Parish Council has not been notified of any application to the Tribunal. <br />As no agreement exists, Quickline currently has no Code Right for the proposed development. <br />   <br />Permitted Development Rights rely on Code Rights or control of land <br />The Quickline notice states an intention to use the General Permitted Development Order (GPDO) to obtain planning consent.   Rudby Parish Council understands the proposed mechanism would be Part 16 Class A which defines Permitted Development as: <br />A. Development by or on behalf of an electronic communications code operator for the purpose of the operator’s electronic communications network in, on, over or under land controlled by that operator or in accordance with the electronic communications code, consisting of— <br />(a) the installation, alteration or replacement of any electronic communications apparatus, <br />Class A is only engaged when a development proposal meets one of two tests: 1) it relates to “land controlled by that operator”; or 2) the proposal is “in accordance with the electronic communications code”.  <br />Quickline does not own, lease or have a wayleave for the land on which it proposes the development. Hence, the land cannot in any sense be deemed as “land controlled by that operator”.  The first test fails. <br />For the reasons set out in more detail above, the proposed locations are not on streets and there is no wayleave, hence neither Code Rights nor Street Works Rights apply to the proposed development.  The proposed development is, therefore, not “in accordance with the electronic communications code”, hence the second test also fails. <br />Planning consent cannot be obtained under Part 16, Class A unless and until Quickline either acquire a Code Right for the development or control of the land neither of which it currently has. <br />Rudby Parish Council acknowledges that a full planning application could be submitted by Quickline, but doing so would first require that you serve notice on Rudby Parish Council as the landowner.  We have received no such notice. <br />Summary <br />This letter focuses on issues related to Code Rights, Street Works Rights, land ownership and occupation, and planning procedures.  For the reasons set out above, it is our opinion that the Quickline proposal is fundamentally flawed on both a procedural and legal basis.  Even if planning consent could be obtained by GPDO, it is our opinion that Quickline currently has no lawful basis to actually carry out the proposed installation on our land. <br />We will address our grounds of objection in terms of material planning considerations separately at the appropriate time.  In broad terms these relate to harms caused to the character and appearance of the Conservation Area and harms caused to the Village Green. <br />Rudby Parish Council requests that Quickline constructively engages with us so that a better way forward for this important infrastructure upgrade can be agreed and brought forward. <br />Rudby Parish Council requests that Openreach confirms in writing by 30th November 2026 that it will not commence any installation work until the issues raised in this letter have been resolved to our satisfaction. ';
        }

        titleElement.appendChild(linkElement);
        return titleElement;
    })(),
    target: 'top-left-container'
});
map.addControl(Abstract);


//geolocate



//measurement





//geocoder


//layer search


//scalebar


//layerswitcher






//attribution
var bottomAttribution = new ol.control.Attribution({
  collapsible: false,
  collapsed: false,
  className: 'bottom-attribution'
});
map.addControl(bottomAttribution);

map.once('rendercomplete', function() {
  var bottomAttributionUl = bottomAttribution.element.querySelector('ul');
  if (bottomAttributionUl) {
    var layerAttrs = Array.from(bottomAttributionUl.querySelectorAll('li'))
      .map(function(li) { return li.innerHTML.trim(); }).filter(Boolean);
    var attribHtml = `
    <a href="https://github.com/qgis2web/qgis2web">qgis2web</a> &middot;
    <a href="https://openlayers.org/">OpenLayers</a> &middot;
    <a href="https://qgis.org/">QGIS</a>`;
    if (layerAttrs.length > 0) { attribHtml += ' &nbsp;|&nbsp; ' + layerAttrs.join(', '); }
    bottomAttributionUl.innerHTML = '<li>' + attribHtml + '</li>';
  }
});


// Disable "popup on hover" or "highlight on hover" if ol-control mouseover
var preDoHover = doHover;
var preDoHighlight = doHighlight;
var isPopupAllActive = false;
document.addEventListener('DOMContentLoaded', function() {
	if (doHover || doHighlight) {
		var controlElements = document.getElementsByClassName('ol-control');
		for (var i = 0; i < controlElements.length; i++) {
			controlElements[i].addEventListener('mouseover', function() { 
				doHover = false;
				doHighlight = false;
			});
			controlElements[i].addEventListener('mouseout', function() {
				doHover = preDoHover;
				if (isPopupAllActive) { return }
				doHighlight = preDoHighlight;
			});
		}
	}
});


//move controls inside containers, in order
    //zoom
    var zoomControl = document.getElementsByClassName('ol-zoom')[0];
    if (zoomControl) {
        topLeftContainerDiv.appendChild(zoomControl);
    }
    //geolocate
    if (typeof geolocateControl !== 'undefined') {
        topLeftContainerDiv.appendChild(geolocateControl);
    }
    //measure
    if (typeof measureControl !== 'undefined') {
        topLeftContainerDiv.appendChild(measureControl);
    }
    //geocoder
    var searchbar = document.getElementsByClassName('photon-geocoder-autocomplete ol-unselectable ol-control')[0];
    if (searchbar) {
        topLeftContainerDiv.appendChild(searchbar);
    }
    //search layer
    var searchLayerControl = document.getElementsByClassName('search-layer')[0];
    if (searchLayerControl) {
        topLeftContainerDiv.appendChild(searchLayerControl);
    }
    //scale line
    var scaleLineControl = document.getElementsByClassName('ol-scale-line')[0];
    if (scaleLineControl) {
        scaleLineControl.className += ' ol-control';
        bottomLeftContainerDiv.appendChild(scaleLineControl);
    }
    //attribution
    var attributionControl = document.getElementsByClassName('bottom-attribution')[0];
    if (attributionControl) {
        bottomRightContainerDiv.appendChild(attributionControl);
    }