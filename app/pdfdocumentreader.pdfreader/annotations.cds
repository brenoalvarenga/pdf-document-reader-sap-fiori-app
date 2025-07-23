using pdfdocumentreaderService as service from '../../srv/service';
annotate service.document with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Número do booking',
                Value : numeroBooking,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Peso',
                Value : peso,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'Número do booking',
            Value : numeroBooking,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Peso',
            Value : peso,
        },
    ],
    UI.HeaderFacets : [
        
    ],
    UI.FieldGroup #Teste : {
        $Type : 'UI.FieldGroupType',
        Data : [
        ],
    },
    // Disable the Create button on List Report
    UI.CreateHidden : true,
);
