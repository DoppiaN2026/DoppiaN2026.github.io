(() => {
  'use strict';
  const state=window.POGGIO_CACHE={status:'preparing',version:document.documentElement.dataset.poggioVersion||''};
  window.POGGIO_CACHE_READY=(async()=>{
    if(location.protocol==='file:'){
      state.status='embedded';return;
    }
    if(!window.isSecureContext||!('serviceWorker' in navigator)){
      state.status='browser-cache';return;
    }
    try{
      const scriptURL=new URL('./sw.js?v='+encodeURIComponent(state.version),location.href).href;
      const registration=await navigator.serviceWorker.register(scriptURL,{scope:'./',updateViaCache:'none'});
      // A newly published version finishes its own complete cache before activation.
      const worker=[registration.installing,registration.waiting,registration.active].find(candidate=>candidate&&candidate.scriptURL===scriptURL);
      if(!worker)throw new Error('Cache non disponibile');
      if(worker.state!=='activated')await new Promise((resolve,reject)=>{
        const changed=()=>{
          if(worker.state==='activated'){worker.removeEventListener('statechange',changed);resolve();}
          else if(worker.state==='redundant'){worker.removeEventListener('statechange',changed);reject(new Error('Cache non disponibile'));}
        };
        worker.addEventListener('statechange',changed);changed();
      });
      state.status='ready';
    }catch(_){
      // Private browsing, disabled storage or a failed download must never hide the site.
      state.status='unavailable';
    }
  })();
})();
