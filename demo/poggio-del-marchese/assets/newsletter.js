window.setupPoggioNewsletter=function(config){
  'use strict';
  const $=selector=>document.querySelector(selector);
  const form=$('#newsletter'),fields=form.querySelector('.form-fields'),status=$('#form-status'),consent=$('#consent'),submit=$('#subscribe');
  function validUrl(value){
    try{
      if(typeof value!=='string'||!value.trim())return false;
      const url=new URL(value,location.href);
      const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
      return (url.protocol==='https:'||(url.protocol==='http:'&&local))&&!url.username&&!url.password;
    }catch(_){return false;}
  }
  const connected=validUrl(config.newsletterEndpoint)&&validUrl(config.privacyUrl);
  if(connected){
    fields.hidden=false;$('#email-label').hidden=false;$('#consent-row').hidden=false;consent.required=true;submit.disabled=false;
    $('#privacy-link').href=config.privacyUrl;$('#newsletter-title').textContent='Avvisami all’apertura';
    status.textContent='Ricevi gli aggiornamenti sul vino e sulla prossima apertura.';
  }
  let pending=false;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!connected||pending||!form.reportValidity())return;
    pending=true;submit.disabled=true;submit.textContent='Invio in corso…';status.textContent='';
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),15000);
    try{
      const response=await fetch(config.newsletterEndpoint,{
        method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({email:$('#email').value.trim(),consent:consent.checked,source:'poggio-del-marchese'}),signal:abort.signal
      });
      if(response.status===429)throw new Error('rate');
      if(!response.ok||!(response.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw new Error('invalid');
      const result=await response.json();
      if(!result||result.success!==true||result.error)throw new Error('invalid');
      form.reset();status.textContent='Richiesta ricevuta. Se il servizio prevede una conferma, controlla la tua email.';
    }catch(error){
      status.textContent=error.message==='rate'?'Troppe richieste. Attendi qualche minuto prima di riprovare.':'Non è stato possibile confermare l’iscrizione. Riprova tra poco.';
    }finally{clearTimeout(timeout);pending=false;submit.disabled=false;submit.textContent='Avvisami all’apertura';}
  });
};
