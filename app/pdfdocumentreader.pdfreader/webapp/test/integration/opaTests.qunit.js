sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'pdfdocumentreader/pdfreader/test/integration/FirstJourney',
		'pdfdocumentreader/pdfreader/test/integration/pages/documentList',
		'pdfdocumentreader/pdfreader/test/integration/pages/documentObjectPage'
    ],
    function(JourneyRunner, opaJourney, documentList, documentObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('pdfdocumentreader/pdfreader') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onThedocumentList: documentList,
					onThedocumentObjectPage: documentObjectPage
                }
            },
            opaJourney.run
        );
    }
);