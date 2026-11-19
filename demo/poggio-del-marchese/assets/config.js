/* Newsletter: collegare un servizio reale prima di attivare il modulo.
   Richiesta POST JSON { email, consent:true, source }.
   Una conferma è valida solo con risposta JSON { success:true }.
   Il servizio deve gestire consensi, conferma email e limiti antiabuso.
   Non inserire credenziali private nel codice pubblico. */
window.POGGIO_CONFIG=Object.assign({newsletterEndpoint:'',privacyUrl:''},window.POGGIO_CONFIG||{});
