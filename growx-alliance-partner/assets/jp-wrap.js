/* 日本語の文節改行（PC・SP共通 / 2026-09-11 PCにも適用）
   BudouX（Google／Apache-2.0）の学習済みモデル assets/budoux-ja.json を読み込み、
   同じ判定アルゴリズムで文節の切れ目にゼロ幅スペースを入れる。
   ・word-break:keep-all で「文節の途中」では折り返さない（「」や句読点の直後は通常どおり折り返し可）。幅に収まらない長い文節だけ overflow-wrap で最終的に折る
   ・SPでは、PC向けに打った <br>（長い文の途中の改行）を外し、文節単位の自動折り返しに任せる
   ・幅は固定pxで決めず、親幅に追従（改行位置は文節判定だけで決まる） */
(function(){
  var SP=matchMedia('(max-width:767px)').matches;
  var ZWSP='\u200B';

  /* 長い行の途中に打たれた <br> を外す（PC・SP共通）（前の行が12文字以上なら「PC用の見た目改行」とみなす）。
     見出しの2行構成など短い行の <br> は残す */
  function relaxBr(el){
    el.querySelectorAll('br').forEach(function(br){
      var prev='', n=br.previousSibling;
      while(n){ prev=(n.textContent||'')+prev; n=n.previousSibling; }
      var line=prev.split('\n').pop().replace(/\s/g,'');
      if(line.length>=12){ br.parentNode.replaceChild(document.createTextNode(''), br); }
    });
  }

  /* ---- 判定器（BudouX parser.ts と同じ計算） ---- */
  function makeParser(model){
    var base=0;
    Object.keys(model).forEach(function(k){ var t=model[k]; Object.keys(t).forEach(function(c){ base+=t[c]; }); });
    base*=-0.5;
    function g(k,s){ var t=model[k]; return (t&&t[s])||0; }
    return function boundaries(t){
      var out=[];
      for(var i=1;i<t.length;i++){
        var p=base;
        p+=g('UW1',t.substring(i-3,i-2)); p+=g('UW2',t.substring(i-2,i-1)); p+=g('UW3',t.substring(i-1,i));
        p+=g('UW4',t.substring(i,i+1));   p+=g('UW5',t.substring(i+1,i+2)); p+=g('UW6',t.substring(i+2,i+3));
        p+=g('BW1',t.substring(i-2,i));   p+=g('BW2',t.substring(i-1,i+1)); p+=g('BW3',t.substring(i,i+2));
        p+=g('TW1',t.substring(i-3,i));   p+=g('TW2',t.substring(i-2,i+1)); p+=g('TW3',t.substring(i-1,i+2)); p+=g('TW4',t.substring(i,i+3));
        if(p>0) out.push(i);
      }
      return out;
    };
  }

  /* ---- 要素内のテキストノードに区切りを入れる ---- */
  function apply(el, boundaries){
    var walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes=[]; var n;
    while((n=walker.nextNode())){
      var p=n.parentElement;
      if(!p || p.closest('svg')) continue;
      if(getComputedStyle(p).whiteSpace==='nowrap') continue; /* nowrap指定の箇所は触らない */
      if(n.nodeValue && /\S/.test(n.nodeValue)) nodes.push(n);
    }
    nodes.forEach(function(tn){
      var s=tn.nodeValue; if(s.indexOf(ZWSP)>=0) return;
      var b=boundaries(s); if(!b.length) return;
      var parts=[], prev=0;
      b.forEach(function(i){ parts.push(s.slice(prev,i)); prev=i; });
      parts.push(s.slice(prev));
      /* 文節の切れ目に「見えない改行候補」（ゼロ幅スペース）を入れるだけ。文字は分割しないので
         グラデーション文字（background-clip:text）でも Safari で確実に表示される */
      /* 文節の内側にある「」）、などの直後は、ブラウザ標準の折り返し候補になるため WORD JOINER（見えない結合記号）で塞ぐ */
      parts=parts.map(function(t){ return t.replace(/([、」』）”])(?=.)/g, '$1\u2060'); });
      tn.nodeValue=parts.join(ZWSP);
    });
    el.style.wordBreak='keep-all';
    el.style.overflowWrap='anywhere';
  }

  /* ---- 見出しのルール（2026-09-12）：1文＝1行 ----
     ① 見出し（h1/h2）は文の切れ目（。！？）で必ず改行する（文の途中では改行しない）
     ② スマホで1文が1行に収まらないときは、収まるまで文字サイズを段階的に下げる（下限 HEAD_MIN）
     ③ それでも収まらない長文だけ、文節で折り返す（文字は分割しない） */
  var HEAD_MIN = SP ? 20 : 24;
  function sentenceBreaks(el){
    var walker=document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes=[], n;
    while((n=walker.nextNode())){ if(!n.parentElement.closest('svg') && /[。！？]/.test(n.nodeValue)) nodes.push(n); }
    nodes.forEach(function(tn){
      var parts=tn.nodeValue.split(/(?<=[。！？])/).filter(function(x){return x.length;});
      if(parts.length<2) return;
      var frag=document.createDocumentFragment();
      parts.forEach(function(t,i){
        frag.appendChild(document.createTextNode(t));
        if(i<parts.length-1 && /\S/.test(parts[i+1])) frag.appendChild(document.createElement('br'));
      });
      tn.parentNode.replaceChild(frag,tn);
    });
  }
  var meter=null;
  function lineWidths(el){
    if(!meter){ meter=document.createElement('span'); meter.style.cssText='position:absolute;left:-99999px;top:0;white-space:nowrap;visibility:hidden;pointer-events:none;'; document.body.appendChild(meter); }
    var cs=getComputedStyle(el);
    meter.style.font=cs.font; meter.style.letterSpacing=cs.letterSpacing; meter.style.fontFeatureSettings=cs.fontFeatureSettings;
    var lines=(el.innerText||'').replace(/[\u200B\u2060]/g,'').split('\n').map(function(t){return t.trim();}).filter(Boolean);
    return lines.map(function(t){ meter.textContent=t; return meter.getBoundingClientRect().width; });
  }
  function fitHeading(el){
    if(!el.dataset.baseFs){ el.dataset.baseFs=parseFloat(getComputedStyle(el).fontSize); }
    var base=parseFloat(el.dataset.baseFs);
    el.style.setProperty('font-size', base+'px', 'important');
    var avail=el.clientWidth; if(!avail) return;
    var max=Math.max.apply(null, lineWidths(el).concat([0]));
    if(max<=avail) return;
    var fs=Math.max(HEAD_MIN, Math.floor(base*avail/max*10)/10);
    el.style.setProperty('font-size', fs+'px', 'important');
  }
  var HEADS='.slide h2, .slide h1, .hero h1';
  function fitAll(){ document.querySelectorAll(HEADS).forEach(function(el){ if(el.closest('svg')) return; try{ fitHeading(el); }catch(e){} }); }
  var rt; addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(fitAll,120); });

  var sel='h1,h2,.card h4,.slide p,.slide li,.gen .role,.gen .ana,.gen .verb,.gen .as,.gen .mtxt,.pat .desc,.bn .t,.incl-h,.incl-g b,.incl-g span:last-child,.incl-f,.note,.src,.dlab,.dname,.fc-hint';

  fetch('assets/budoux-ja.json').then(function(r){ return r.json(); }).then(function(model){
    var boundaries=makeParser(model);
    document.querySelectorAll(sel).forEach(function(el){
      if(el.closest('svg')) return;
      /* 数値カウントアップ対象（.bigv/.cmpv）や計測表示（[data-lv]など）はJSが文字列を書き換えるため除外 */
      if(el.querySelector('.bigv,.cmpv,[data-lv],#lvCount,#lvTime')) return;
      try{ if(el.matches('.slide p, .slide li')) relaxBr(el); if(el.matches(HEADS)) sentenceBreaks(el); apply(el, boundaries); }catch(e){}
    });
    fitAll();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  }).catch(function(){});
})();
