/* 日本語の文節改行（PC・SP共通 / 2026-09-11 PCにも適用）
   BudouX（Google／Apache-2.0）の学習済みモデル assets/budoux-ja.json を読み込み、
   同じ判定アルゴリズムで文節の切れ目にゼロ幅スペースを入れる。
   ・word-break:keep-all で「文節の途中」では折り返さない。幅に収まらない長い文節だけ overflow-wrap で最終的に折る
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
      var s=tn.nodeValue; if(tn.parentElement.classList.contains('jw')) return;
      var b=boundaries(s);
      var parts=[], prev=0;
      b.forEach(function(i){ parts.push(s.slice(prev,i)); prev=i; });
      parts.push(s.slice(prev));
      if(parts.length<2 && !/[、。」）”]/.test(s)) return;
      /* 各文節を inline-block の <span class="jw"> で包む：文節の途中（「」や句読点の直後も含む）で折れなくなる */
      var frag=document.createDocumentFragment();
      parts.forEach(function(t){ if(!t) return; var sp=document.createElement('span'); sp.className='jw'; sp.textContent=t; frag.appendChild(sp); });
      tn.parentNode.replaceChild(frag, tn);
    });
    el.style.wordBreak='keep-all';
    el.style.overflowWrap='anywhere';
  }

  var sel='h1,h2,.card h4,.slide p,.slide li,.gen .role,.gen .ana,.gen .verb,.gen .as,.gen .mtxt,.pat .desc,.bn .t,.incl-h,.incl-g b,.incl-g span:last-child,.incl-f,.note,.src,.dlab,.dname,.fc-hint';

  fetch('assets/budoux-ja.json').then(function(r){ return r.json(); }).then(function(model){
    var boundaries=makeParser(model);
    document.querySelectorAll(sel).forEach(function(el){
      if(el.closest('svg')) return;
      /* 数値カウントアップ対象（.bigv/.cmpv）や計測表示（[data-lv]など）はJSが文字列を書き換えるため除外 */
      if(el.querySelector('.bigv,.cmpv,[data-lv],#lvCount,#lvTime')) return;
      try{ if(el.matches('.slide p, .slide li')) relaxBr(el); apply(el, boundaries); }catch(e){}
    });
  }).catch(function(){});
})();
