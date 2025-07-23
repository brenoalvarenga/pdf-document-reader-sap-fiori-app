using { pdfdocumentreaderNamespace as my } from '../db/schema.cds';

@path : '/service/pdfdocumentreaderService'
service pdfdocumentreaderService
{
    // @odata.draft.enabled
    entity document as
        projection on my.document;
}

annotate pdfdocumentreaderService with @requires :
[
    'authenticated-user'
];
