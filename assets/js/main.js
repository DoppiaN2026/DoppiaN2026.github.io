'use strict';
document.documentElement.classList.add('js');
window.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('site-menu');
  const setMenu = open => {
    if (!toggle || !menu) return;
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    if(open) menu.querySelector('a')?.focus();
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if(e.key === 'Escape') setMenu(false); });
  const scrollHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 20);
  scrollHeader();
  window.addEventListener('scroll', scrollHeader, {passive:true});
  // Make content visible if IntersectionObserver unavailable.
  const reveals = document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){entry.target.classList.add('in-view');obs.unobserve(entry.target);}
      });
    }, {threshold:0.08,rootMargin:'0px 0px -35px 0px'});
    reveals.forEach(el=>obs.observe(el));
  } else reveals.forEach(el=>el.classList.add('in-view'));

  const filters = document.querySelectorAll('[data-filter]');
  const cards = document.querySelectorAll('[data-project-card]');
  filters.forEach(btn => btn.addEventListener('click', () => {
    const category = btn.dataset.filter;
    filters.forEach(b=>{b.classList.toggle('is-selected',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
    let count=0;
    cards.forEach(card=>{const visible = category === 'all' || card.dataset.category === category;card.hidden = !visible;if(visible)count++;});
    const empty=document.querySelector('[data-empty]');if(empty)empty.hidden=count>0;
  }));

  const form=document.getElementById('contact-form');
  if(form){
    const feed=form.querySelector('.form-feedback');
    const result=form.querySelector('.form-result');
    const msgEl=document.getElementById('prepared-message');
    const emailLink=document.getElementById('email-request');
    const safeText = value => String(value||'').replace(/[\r\n]+/g,' ').trim();
    form.addEventListener('submit',event=>{
      event.preventDefault();
      form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
      if(!form.checkValidity()){
        const invalid=form.querySelector(':invalid');
        invalid?.setAttribute('aria-invalid','true');invalid?.focus();
        feed.textContent='Completa i campi obbligatori e inserisci un indirizzo email valido.';
        feed.classList.add('is-error');feed.hidden=false;
        result.hidden=true;
        return;
      }
      const d=new FormData(form);
      const nome=safeText(d.get('nome')), email=safeText(d.get('email')), azienda=safeText(d.get('azienda')), servizio=safeText(d.get('servizio'));
      const note=String(d.get('messaggio')||'').trim();
      const body=[`Nuova richiesta per DoubleN Digital Solutions`,``,`Nome: ${nome}`,`Email: ${email}`,`Attività: ${azienda||'Non specificata'}`,`Servizio: ${servizio}`,``,`Descrizione del progetto:`,note].join('\n');
      msgEl.value=body;result.hidden=false;
      const contactEmail=(window.DOUBLEN_CONFIG?.contactEmail||'').trim();
      if(contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)){
        emailLink.href=`mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent('Richiesta progetto — '+servizio)}&body=${encodeURIComponent(body)}`;
        emailLink.hidden=false;
        feed.textContent='Richiesta pronta: puoi copiarla oppure aprire il tuo programma email.';
      } else {
        emailLink.hidden=true;
        feed.textContent='La richiesta è pronta. Copiala qui sotto: l’indirizzo aziendale di destinazione sarà aggiunto prima della pubblicazione.';
      }
      feed.classList.remove('is-error');feed.hidden=false;
      result.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
    });
    document.getElementById('copy-request')?.addEventListener('click',async()=>{
      const txt=msgEl.value;
      try {await navigator.clipboard.writeText(txt); feed.textContent='Richiesta copiata negli appunti.';}
      catch {msgEl.focus();msgEl.select();feed.textContent='Seleziona e copia il testo della richiesta.';}
      feed.classList.remove('is-error');feed.hidden=false;
    });
  }
});
