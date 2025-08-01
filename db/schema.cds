namespace pdfdocumentreaderNamespace;

entity document
{
    key ID : UUID;
    numeroBooking : String;
    qtdContainer : String;
    navio : String;
    viagem : String;
    armador : String;
    eta : String;
    portoOrigem : String;
    portoDestino : String;
    destinoFinal : String;    
}
