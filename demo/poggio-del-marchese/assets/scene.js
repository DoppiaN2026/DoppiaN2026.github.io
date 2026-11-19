/* Three.js r128 and its matching GLTFLoader are supplied locally under MIT. */
window.createPoggioScene = function(model, onFailure) {
  'use strict';
  const T = window.THREE, root = document.documentElement;
  const $ = selector => document.querySelector(selector);
  const clamp = (v,a=0,b=1) => Math.min(b,Math.max(a,v));
  const mix = (a,b,t) => a+(b-a)*t;
  const smooth = (a,b,v) => { const t=clamp((v-a)/(b-a)); return t*t*(3-2*t); };
  const sceneError=(cause,code)=>Object.assign(new Error(cause?.message||String(cause)),{code,cause});
  const canvas=$('#wine-canvas'), track=$('#inizio'), stage=$('#stage');
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'default'});
  renderer.outputEncoding=T.sRGBEncoding;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.06;
  renderer.setClearColor(0x171416,0);
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(28,1,.1,80);
  const disposables=[];
  const own=resource => { disposables.push(resource); return resource; };
  try {
    // Studio riflesso nel vetro: la stessa tecnica del riferimento funzionante.
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 1024; envCanvas.height = 512;
    const ec = envCanvas.getContext('2d');
    ec.fillStyle = '#0d0a0c'; ec.fillRect(0, 0, 1024, 512);
    ec.shadowColor = '#fff2db'; ec.shadowBlur = 28; ec.fillStyle = '#fff2db';
    [[90,80,46,360,.95],[410,70,48,370,.72],[628,75,48,365,.75],[932,80,38,360,.9],[266,22,488,30,.64]].forEach(([x,y,w,h,a]) => {
      ec.globalAlpha = a; ec.fillRect(x, y, w, h);
    });
    const envTexture = new T.CanvasTexture(envCanvas);
    envTexture.mapping = T.EquirectangularReflectionMapping;
    envTexture.encoding = T.sRGBEncoding;
    const pmrem = new T.PMREMGenerator(renderer);
    const environment = own(pmrem.fromEquirectangular(envTexture));
    scene.environment = environment.texture;
    envTexture.dispose(); pmrem.dispose();


  const tilt=new T.Group(), bottle=new T.Group();
  const bounds=new T.Box3().setFromObject(model), size=bounds.getSize(new T.Vector3());
  if (size.y < .1) { renderer.dispose(); throw new Error('Modello non valido'); }
  const midpoint=bounds.getCenter(new T.Vector3()), factor=3.57/size.y;
  model.scale.multiplyScalar(factor);
  model.position.set(-midpoint.x*factor,-bounds.min.y*factor,-midpoint.z*factor);
  model.traverse(obj => {
    if (!obj.isMesh) return;
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    materials.filter(Boolean).forEach(mat => {
      if (mat.map) mat.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    });
  });
  bottle.add(model); tilt.add(bottle); scene.add(tilt); bottle.position.y=-1.78;
  const labelRadius=.595,labelHeight=1.05,labelArc=(1.05*1800/1620)/.595,labelY=.95-1.78;
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
    const sc = shadowCanvas.getContext('2d');
    const gradient = sc.createRadialGradient(64,64,0,64,64,64);
    gradient.addColorStop(0,'rgba(0,0,0,.65)'); gradient.addColorStop(1,'rgba(0,0,0,0)');
    sc.fillStyle = gradient; sc.fillRect(0,0,128,128);
    const shadow = new T.Mesh(own(new T.PlaneGeometry(3,3)), own(new T.MeshBasicMaterial({ map: own(new T.CanvasTexture(shadowCanvas)), transparent: true, depthWrite: false, opacity: .65 })));
    shadow.rotation.x = -Math.PI/2; shadow.position.y = -1.786; scene.add(shadow);
    const key = new T.DirectionalLight(0xffe5c5, 1.75);
    const fill = new T.DirectionalLight(0xe5dfd1, .5); fill.position.set(-3,1,4);
    const rim = new T.DirectionalLight(0xc1cfdf, .7); rim.position.set(-3,2,-4);
    scene.add(key, fill, rim, new T.AmbientLight(0x5b3b42, .5));

    const title = $('#hero-copy'), side = $('#hero-side'), bottom = $('#scene-bottom');
    const wineData = $('#scene-wine-data');
    const progressBar = $('#film-progress'), chapter = $('#scene-chapter');
    let width = 1, height = 1, startDistance = 10, endDistance = 4, startY = .1;
    let dataDistance = 10, dataCenter = .28;
    let current = 0, target = 0, frameId = 0, last = 0, frames = 0;
    let destroyed = false, visible = true, trackTop = 0, travel = 1;

    function updatePose(progress) {
      const turn = smooth(.15,.58,progress);
      const close = smooth(.58,.70,progress);
      const revealWine = smooth(.75,.85,progress);
      const fade = smooth(.973,1,progress);
      bottle.rotation.y = turn * Math.PI * 2;
      tilt.rotation.x = Math.sin(turn*Math.PI) * .045;
      tilt.rotation.z = Math.sin(turn*Math.PI*2) * .045;
      const cameraY = mix(mix(startY,labelY,close),.08,revealWine);
      const cameraX = Math.sin(turn*Math.PI) * .11 * (1-close);
      const distance = mix(mix(mix(startDistance,startDistance*.92,turn),endDistance,close),dataDistance,revealWine);
      // Dopo il dettaglio, arretra la camera e porta la bottiglia nella colonna sinistra.
      // Lo spostamento usa la larghezza visibile della scena 3D, non pixel fissi.
      const visibleWidth = 2*Math.tan(camera.fov*Math.PI/360)*(distance-labelRadius)*camera.aspect;
      tilt.position.x = (dataCenter-.5)*visibleWidth*revealWine;
      camera.position.set(cameraX,cameraY,distance);
      camera.lookAt(0,cameraY,0);
      key.position.set(mix(-3.8,-1.4,turn),3,4.6);
      key.intensity = mix(1.75,1.4,close);
      shadow.position.x = tilt.position.x;
      shadow.material.opacity = .65 * (1-smooth(.5,.70,progress)) + .45*revealWine;
      const titleOpacity = 1-smooth(.10,.25,progress);
      title.style.opacity = String(titleOpacity);
      title.style.transform = 'translateY(' + (-20*(1-titleOpacity)) + 'px)';
      side.style.opacity = String(1-smooth(.14,.32,progress));
      bottom.style.opacity = String(1-fade);
      $('#scroll-invitation').style.opacity = String(1-smooth(.03,.15,progress));
      progressBar.style.transform = 'scaleX(' + progress + ')';
      $('#scene-veil').style.opacity = String(fade);
      const dataOpacity = smooth(.805,.875,progress)*(1-fade);
      wineData.style.opacity = String(dataOpacity);
      wineData.style.transform = 'translate3d(' + (20*(1-dataOpacity)) + 'px,-50%,0)';
      const dataHidden = dataOpacity < .05;
      if (wineData.getAttribute('aria-hidden') !== String(dataHidden)) wineData.setAttribute('aria-hidden',String(dataHidden));
      const text = progress < .15 ? '01 — Un nuovo inizio' : progress < .58 ? '02 — Il carattere prende forma' : progress < .75 ? '03 — Poggio del Marchese' : '04 — Il nostro Rosso Conero DOC';
      if (chapter.textContent !== text) chapter.textContent = text;
      stage.dataset.bottleX = tilt.position.x.toFixed(5);
      stage.dataset.progress = progress.toFixed(4);
      stage.dataset.rotation = bottle.rotation.y.toFixed(5);
    }

    function progressFromPage() { return clamp((scrollY-trackTop)/travel); }
    function schedule() {
      if (!frameId && !destroyed && visible && !document.hidden) frameId = requestAnimationFrame(renderFrame);
    }
    function renderFrame(now) {
      frameId = 0;
      if (destroyed || !visible || document.hidden) { last = 0; return; }
      const dt = last ? Math.min(.05,(now-last)/1000) : 1/60;
      last = now;
      current += (target-current)*(1-Math.exp(-dt*18));
      if (Math.abs(target-current)<.00004) current = target;
      try {
        updatePose(current);
        if(renderer.getContext().isContextLost())throw Object.assign(new Error('WebGL context lost'),{code:'CONTEXT_LOST'});
        renderer.render(scene,camera);
        stage.dataset.frames = String(++frames);
      } catch (error) {
        stop(); onFailure(sceneError(error,typeof error.code==='string'?error.code:'RENDER_ERROR')); return;
      }
      if (Math.abs(target-current)>.00004) schedule();
      else last = 0;
    }
    function onScroll() {
      target = progressFromPage();
      const rect = track.getBoundingClientRect();
      visible = rect.bottom > 0 && rect.top < innerHeight;
      if (visible) schedule();
    }
    function resize(initial=false) {
      if (destroyed) return;
      try {
      width = Math.max(1,stage.clientWidth); height = Math.max(1,stage.clientHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1,width < 760 ? 1.65 : 1.8,Math.sqrt(2300000/(width*height))));
      renderer.setSize(width,height,false);
      const aspect = width/height;
      camera.aspect = aspect; camera.updateProjectionMatrix();
      const f = 2*Math.tan(camera.fov*Math.PI/360);
      const portrait = matchMedia('(max-width:599px)').matches && aspect < 1;
      startDistance = Math.max(3.57/(f*(height<520 ? .66 : .76)),1.2/(f*aspect*.48));
      startY = height<520 ? .20 : .08;
      if(portrait){
        const top=Math.max($('#site-header').offsetHeight+12,title.offsetTop+title.offsetHeight+18);
        const bottom=height-(height<650?50:65);
        const available=Math.max(120,bottom-top);
        const fraction=Math.min(.64,available/height);
        startDistance=Math.max(3.57/(f*fraction),1.2/(f*aspect*.72));
        startY=((top+available/2)/height-.5)*f*startDistance;
      }
      const visibleLabelWidth = 2*labelRadius*Math.sin(labelArc/2);
      endDistance = labelRadius + Math.max(labelHeight/(f*.68),visibleLabelWidth/(f*aspect*.85));
      const shortLandscape = height < 520 && aspect > 1;
      dataCenter = portrait ? .22 : .28;
      dataDistance = labelRadius + Math.max(3.57/(f*(portrait ? .64 : shortLandscape ? .65 : .75)),1.02/(f*aspect*(portrait ? .36 : .32)));
      trackTop = track.getBoundingClientRect().top+scrollY;
      travel = Math.max(1,track.offsetHeight-height);
      target = progressFromPage();
      current = target;
      updatePose(current);
      if(renderer.getContext().isContextLost())throw Object.assign(new Error('WebGL context lost'),{code:'CONTEXT_LOST'});
      renderer.render(scene,camera);
      stage.dataset.frames = String(++frames);
      const box=new T.Box3().setFromObject(model);
      let minY=Infinity,maxY=-Infinity;
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const point=new T.Vector3(x,y,z).project(camera),screenY=(1-point.y)*height/2;
        minY=Math.min(minY,screenY);maxY=Math.max(maxY,screenY);
      }
      stage.dataset.bottleScreenTop=minY.toFixed(1);
      stage.dataset.bottleScreenBottom=maxY.toFixed(1);
      stage.dataset.bottleScreenHeight=(maxY-minY).toFixed(1);
      } catch(error) {
        if(initial===true)throw error;
        stop();onFailure(sceneError(error,typeof error.code==='string'?error.code:'RENDER_ERROR'));
      }
    }
    function onVisibility() {
      if (document.hidden) { if (frameId) cancelAnimationFrame(frameId); frameId = 0; last = 0; }
      else onScroll();
    }
    function contextLost(event) {
      event.preventDefault();stop();
      onFailure(Object.assign(new Error('WebGL context lost'),{code:'CONTEXT_LOST'}));
    }
    let resizeObserver = null;
    // La scena usa soltanto il modello ufficiale con texture incorporate.
    let loadedBottle = model;
    const disposeGLB = (model) => model.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.geometry) obj.geometry.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.filter(Boolean).forEach(mat => {
        Object.keys(mat).forEach(k => {
          const value = mat[k];
          if (value && value.isTexture) value.dispose();
        });
        mat.dispose();
      });
    });
    function stop() {
      if (destroyed) return;
      destroyed = true;
      if (frameId) cancelAnimationFrame(frameId);
      removeEventListener('scroll',onScroll);
      removeEventListener('resize',resize);
      document.removeEventListener('visibilitychange',onVisibility);
      canvas.removeEventListener('webglcontextlost',contextLost);
      if (resizeObserver) resizeObserver.disconnect();
      if (loadedBottle) { disposeGLB(loadedBottle); loadedBottle = null; }
      disposables.forEach((resource) => resource.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    }
    root.classList.add('has-scene');
    wineData.hidden = false;
    stage.dataset.renderer = 'webgl';
    resize(true);
    addEventListener('scroll',onScroll,{passive:true});
    addEventListener('resize',resize,{passive:true});
    document.addEventListener('visibilitychange',onVisibility);
    canvas.addEventListener('webglcontextlost',contextLost);
    if ('ResizeObserver' in window) {
      let oldWidth = width, oldHeight = height;
      resizeObserver = new ResizeObserver(() => {
        if (stage.clientWidth !== oldWidth || stage.clientHeight !== oldHeight) {
          oldWidth = stage.clientWidth; oldHeight = stage.clientHeight; resize();
        }
      });
      resizeObserver.observe(stage);
    }

  stage.dataset.model='glb';
  stage.dataset.ready='true';
  return {stop, refresh:resize};
  } catch(error) {
    disposables.forEach(resource=>{try{resource.dispose();}catch(_){}});
    renderer.dispose();renderer.forceContextLoss();
    throw error;
  }
};
