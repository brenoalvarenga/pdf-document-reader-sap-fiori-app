using pdfdocumentreaderService as service from '../../srv/service';
annotate service.document with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>numeroBooking}',
                Value : numeroBooking,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>qtdContainer}',
                Value : qtdContainer,
            },
            {
                $Type : 'UI.DataField',
                Label : '{@i18n>navio}',
                Value : navio,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : '{@i18n>informacoesGerais}',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>numeroBooking}',
            Value : numeroBooking,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>qtdContainer}',
            Value : qtdContainer,
        },
        {
            $Type : 'UI.DataField',
            Label : '{@i18n>navio}',
            Value : navio,
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
