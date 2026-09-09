(function(){
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); countUp(e.target);} });
  }, {threshold:.25});
  document.querySelectorAll('.slide').forEach(function(s){ io.observe(s); });
  /* stagger reveals */
  document.querySelectorAll('.slide').forEach(function(s){
    s.querySelectorAll('.rv').forEach(function(el,i){ el.style.transitionDelay=(i*0.12)+'s'; });
  });
  /* count-up numbers */
  function countUp(slide){
    if(reduced) return;
    slide.querySelectorAll('.bigv,.cmpv').forEach(function(el){
      if(el.dataset.cu) return; el.dataset.cu=1;
      var tn=null; el.childNodes.forEach(function(n){ if(n.nodeType===3 && /[0-9]/.test(n.textContent) && !tn) tn=n; });
      if(!tn) return;
      var full=tn.textContent, m=full.match(/([^0-9]*)([0-9][0-9,\.]*)(.*)/); if(!m) return;
      var target=parseFloat(m[2].replace(/,/g,'')), dec=(m[2].split('.')[1]||'').length, hasComma=m[2].indexOf(',')>-1;
      var t0=null, dur=1300;
      function fmt(v){ var s=v.toFixed(dec); if(hasComma) s=s.replace(/\B(?=(\d{3})+(?!\d))/g,','); return m[1]+s+m[3]; }
      function step(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/dur); p=1-Math.pow(1-p,3); tn.textContent=fmt(target*p); if(p<1) requestAnimationFrame(step); else tn.textContent=full; }
      tn.textContent=fmt(0); requestAnimationFrame(step);
    });
  }
  /* card tilt: the page answers your hand */
  if(!reduced && matchMedia('(pointer:fine)').matches){
    document.querySelectorAll('.card,.gen').forEach(function(c){
      if(c.id==='gen3flip'||c.classList.contains('fcard')) return;
      c.addEventListener('pointermove',function(e){
        var b=c.getBoundingClientRect(), x=(e.clientX-b.left)/b.width-.5, y=(e.clientY-b.top)/b.height-.5;
        c.style.transform='perspective(900px) rotateY('+(x*5)+'deg) rotateX('+(-y*5)+'deg) translateY(-2px)';
      });
      c.addEventListener('pointerleave',function(){ c.style.transform=''; });
    });
  }
  /* slide 04: tap to reveal the memory chain */
  (function(){
    var zone=document.getElementById('tapZone'), hint=document.getElementById('tapHint');
    var t1=document.getElementById('tr1'), t2=document.getElementById('tr2'), t3=document.getElementById('tr3');
    var card=document.getElementById('memCard'), blank=document.getElementById('memBlank'), fin=document.getElementById('memFinal');
    if(!zone||!card) return;
    var fired=false;
    zone.addEventListener('click',function(){
      if(fired) return; fired=true;
      hint.textContent='';
      var pulse=zone.querySelector('animate'); if(pulse&&pulse.endElement) try{pulse.endElement()}catch(e){}
      setTimeout(function(){ t1.style.opacity=1; }, 100);
      setTimeout(function(){ t2.style.opacity=1; }, 650);
      setTimeout(function(){ t3.style.opacity=1; }, 1250);
      setTimeout(function(){ card.style.transform='scaleX(0)'; }, 1750);
      setTimeout(function(){
        blank.style.opacity=0; fin.style.opacity=1;
        card.style.transition='transform .34s cubic-bezier(.2,.9,.3,1.3)';
        card.style.transform='scaleX(1)';
      }, 2030);
    });
  })();
  /* flip cards: half-turn, swap, half-turn (no backface dependency) */
  function halfFlip(card, front, back, axis, t1, t2){
    card.classList.add('flipped');
    front.style.animation='none';
    front.style.transition='transform '+t1+'ms cubic-bezier(.55,0,.85,.4)';
    front.style.transform='rotate3d('+axis+',90deg)';
    setTimeout(function(){
      front.style.display='none';
      back.style.visibility='visible';
      back.style.transform='rotate3d('+axis+',-90deg)';
      back.style.transition='none';
      requestAnimationFrame(function(){requestAnimationFrame(function(){
        back.style.transition='transform '+t2+'ms cubic-bezier(.15,.6,.25,1)';
        back.style.transform='rotate3d('+axis+',0deg)';
      });});
    }, t1);
  }
  (function(){
    var axes=['0,1,0','1,0,0','1,1,0'], t1s=[620,760,700], t2s=[820,980,900];
    document.querySelectorAll('.fcard').forEach(function(c,i){
      c.addEventListener('click',function(){
        halfFlip(c, c.querySelector('.fc-front'), c.querySelector('.fc-back'), axes[i%3], t1s[i%3], t2s[i%3]);
      },{once:true});
    });
    var z=document.querySelector('.zerocard');
    if(z) z.addEventListener('click',function(){
      halfFlip(z, z.querySelector('.zc-front'), z.querySelector('.zc-back'), '0,1,0', 600, 800);
    },{once:true});
    var f=document.getElementById('gen3flip');
    if(f) f.addEventListener('click',function(){
      halfFlip(f, f.querySelector('.g3front'), f.querySelector('.g3back'), '0,1,0', 650, 850);
    },{once:true});
  })();
  /* slide 09: tap pours money — left forgets, right remembers */
  (function(){
    var svg=document.getElementById('bowlSvg'); if(!svg) return;
    var layer=document.getElementById('dropsLayer'), water=document.getElementById('waterR'), hint=document.getElementById('bowlHint');
    var NS='http://www.w3.org/2000/svg', spend=0, taps=0;
    var LXc=[118,174,230,286,342], RXc=[638,694,750,806,862];
    var lvlL=[0,0,0,0,0], lvlR=[0,0,0,0,0], starDone=[0,0,0,0,0], starDoneL=[0,0,0,0,0];
    function star(cx){
      var layer2=document.getElementById('starsR'); if(!layer2) return;
      var p=document.createElementNS(NS,'path');
      p.setAttribute('d','M'+cx+' 160 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z');
      p.setAttribute('fill','#EDE4FF'); layer2.appendChild(p);
      var a=document.createElementNS(NS,'animate');
      a.setAttribute('attributeName','opacity'); a.setAttribute('values','0;1;.6;1'); a.setAttribute('dur','1.2s');
      p.appendChild(a); if(a.beginElement) try{a.beginElement()}catch(e){}
    }
    function anim(el,dur,fn,onEnd){ var t0=null;
      function step(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/dur); fn(p);
        if(p<1) requestAnimationFrame(step); else { el.remove(); onEnd&&onEnd(); } }
      requestAnimationFrame(step); }
    function dot(x,leak,color,onEnd){
      var c=document.createElementNS(NS,'circle');
      c.setAttribute('r',5.5); c.setAttribute('fill',color); layer.appendChild(c);
      anim(c, leak?1300:900, function(p){ var e=p*p;
        var y=124+e*(leak?200:96); var o=(leak&&p>.72)?1-(p-.72)/.28:1;
        c.setAttribute('cx',x); c.setAttribute('cy',y); c.setAttribute('opacity',o); }, onEnd); }
    function bill(x,leak){
      var g=document.createElementNS(NS,'g');
      g.innerHTML='<rect x="-12" y="-7" width="24" height="14" rx="2.5" fill="#E8C97A" stroke="#B8964F" stroke-width="1"/><text y="4.5" text-anchor="middle" font-size="10" font-weight="900" fill="#6b5320">¥</text>';
      layer.appendChild(g);
      anim(g, leak?1500:1000, function(p){ var e=p*p;
        var y=124+e*(leak?196:90), rot=Math.sin(p*7)*28, o=1;
        if(leak&&p>.6) o=1-(p-.6)/.4; if(!leak&&p>.85) o=1-(p-.85)/.15;
        g.setAttribute('transform','translate('+(x+Math.sin(p*5)*8)+','+y+') rotate('+rot+')');
        g.setAttribute('opacity',o); }); }
    svg.addEventListener('click',function(){
      if(hint){hint.textContent='';hint=null;}
      spend+=10; taps++;
      var sc=document.getElementById('spendC');
      if(sc) sc.textContent='投下した広告費　'+spend+'万円';
      if(spend>=20){ var bl=document.getElementById('bubL'); if(bl) bl.style.opacity=1; }
      /* per-person memory rates: FULL=61px of fill */
      /* left(static): slow or none — [per-tap px] */
      var rateL=[3.34,2.0,2.73,2.5,1.77], rateR=[15,9,5,12,7.5];
      [146,230,314].forEach(function(x,i){
        setTimeout(function(){
          if(i===1){ dot(x,false,'#8A8A98',function(){
            LXc.forEach(function(cx,k){
              lvlL[k]=Math.min(44,lvlL[k]+rateL[k]);
              var w=document.getElementById('wL'+k); if(w) w.setAttribute('y',218-lvlL[k]);
              if(lvlL[k]>=30&&!starDoneL[k]){ starDoneL[k]=1; star(cx);
                var nL=starDoneL.filter(Boolean).length;
                var wl2=document.getElementById('thWinL'); if(wl2) wl2.style.opacity=1;
                var wt2=document.getElementById('thWinLT');
                if(wt2) wt2.textContent=(nL===1)?(spend+'万円で、ようやく1人目が検索'):(spend+'万円で、'+nL+'人目が検索');
              }
            });
          }); } else { dot(x,true,'#6E6E82'); }
        }, i*160);
      });
      [670,750,830].forEach(function(x,i){
        setTimeout(function(){
          dot(x,false,'#D9C2FF', i===2?function(){
            var crossed=0;
            RXc.forEach(function(cx,k){
              lvlR[k]=Math.min(44,lvlR[k]+rateR[k]);
              var w=document.getElementById('wR'+k); if(w) w.setAttribute('y',218-lvlR[k]);
              if(lvlR[k]>=30&&!starDone[k]){ starDone[k]=1; crossed=1; star(cx); }
            });
            var n=starDone.filter(Boolean).length;
            if(n>=2){
              ['thWin','winFx','bubR'].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.opacity=1; });
              var tl=document.getElementById('thLineR'); if(tl){ tl.setAttribute('stroke','#D9C2FF'); tl.setAttribute('opacity','1'); }
              var lb=document.getElementById('thLabelR'); if(lb) lb.setAttribute('fill','#D9C2FF');
            }
          }:null);
        }, i*160);
      });
      setTimeout(function(){ bill(200,true); },80);
      setTimeout(function(){ bill(270,true); },300);
      setTimeout(function(){ bill(720,false); },80);
      setTimeout(function(){ bill(790,false); },300);
    });
  })();
  /* live session meter (slide 16) */
  (function(){
    var t0=Date.now(), taps={};
    var map=[['.fcard','fcard'],['#tapZone','tap'],['#gen3flip','gen3'],['#bowlSvg','bowl'],['#quizSvg','quiz'],['.zerocard','zero']];
    document.addEventListener('click',function(e){
      map.forEach(function(m){ if(e.target.closest && e.target.closest(m[0])) taps[m[1]]=1; });
    },true);
    setInterval(function(){
      var el=document.getElementById('lvTime');
      if(el){ var s=Math.floor((Date.now()-t0)/1000); el.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
      var n=0;
      document.querySelectorAll('[data-lv]').forEach(function(d){
        if(taps[d.dataset.lv]){ n++; if(d.style.color!=='rgb(201, 190, 255)'){ d.style.color='#C9BEFF'; d.style.fontWeight='700'; d.textContent='✓ '+d.textContent.slice(2); } }
      });
      var c=document.getElementById('lvCount'); if(c) c.textContent=n+' / 6';
    },1000);
  })();
  /* reading progress */
  (function(){
    var bar=document.getElementById('readbar'); if(!bar) return;
    addEventListener('scroll',function(){
      var m=document.documentElement.scrollHeight-innerHeight;
      bar.style.width=(m>0?(scrollY/m*100):0)+'%';
    },{passive:true});
  })();
  /* magnetic glow: slides get a soft light following the pointer */
  (function(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||!matchMedia('(pointer:fine)').matches) return;
    document.querySelectorAll('.slide').forEach(function(s){
      var gl=document.createElement('div');
      gl.style.cssText='position:absolute;left:50%;top:50%;width:46cqw;height:46cqw;border-radius:50%;pointer-events:none;z-index:0;opacity:0;transition:opacity .5s;background:radial-gradient(circle,rgba(160,110,255,.10),transparent 62%);transform:translate(-50%,-50%);';
      s.appendChild(gl);
      s.addEventListener('pointermove',function(e){
        var b=s.getBoundingClientRect();
        gl.style.opacity=1; gl.style.left=(e.clientX-b.left)+'px'; gl.style.top=(e.clientY-b.top)+'px';
      });
      s.addEventListener('pointerleave',function(){ gl.style.opacity=0; });
    });
  })();
  /* cover: particles that follow the reader */
  if(!reduced){
    var cover=document.querySelector('.slide.cover');
    if(cover){
      var cv=document.createElement('canvas');
      cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
      var anchor=cover.querySelector('.orb2')||cover.querySelector('.orb'); if(anchor) anchor.after(cv); else cover.prepend(cv);
      var ctx=cv.getContext('2d'),W,H,ps=[];
      /* レスポンシブ対応：SPでは devicePixelRatio を1.5上限にしてGPU負荷を抑える（PCは従来どおり） */
      var dpr=matchMedia('(max-width:767px)').matches?Math.min(devicePixelRatio,1.5):devicePixelRatio;
      function rs(){W=cv.width=cv.offsetWidth*dpr;H=cv.height=cv.offsetHeight*dpr;
        ps=Array.from({length:70},function(){return {x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.22,vy:(Math.random()-.5)*.22,r:(Math.random()*1.5+.6)*dpr};});}
      rs(); new ResizeObserver(rs).observe(cv);
      var mx=-9e9,my=-9e9;
      cover.addEventListener('pointermove',function(e){var b=cv.getBoundingClientRect();mx=(e.clientX-b.left)*dpr;my=(e.clientY-b.top)*dpr;});
      cover.addEventListener('pointerleave',function(){mx=my=-9e9;});
      (function lp(){
        ctx.clearRect(0,0,W,H); var R=200*dpr;
        ps.forEach(function(p){
          var dx=mx-p.x,dy=my-p.y,d=Math.hypot(dx,dy);
          if(d<R&&d>1){p.vx+=dx/d*.04;p.vy+=dy/d*.04;}
          p.vx*=.985;p.vy*=.985;p.x+=p.vx;p.y+=p.vy;
          if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
          if(d<R){ctx.strokeStyle='rgba(182,125,255,'+((1-d/R)*.45)+')';ctx.lineWidth=dpr*.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mx,my);ctx.stroke();}
          ctx.fillStyle=d<R?'rgba(217,194,255,.9)':'rgba(182,125,255,.5)';
          ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill();
        });
        requestAnimationFrame(lp);
      })();
    }
  }
})();

/* レスポンシブ対応：SP（〜767px）専用の追加処理。PCでは何もしない（文節改行は assets/jp-wrap.js） */
(function(){
  if(!matchMedia('(max-width:767px)').matches) return;
  /* 05：主役（御社）が図の中央にあるため、横スクロールの初期位置を中央にする */
  document.querySelectorAll('.fig').forEach(function(f){
    var s=f.querySelector('svg[aria-label*="一社だけ"]'); if(!s) return;
    f.scrollLeft=Math.max(0,(f.scrollWidth-f.clientWidth)/2);
  });
})();
