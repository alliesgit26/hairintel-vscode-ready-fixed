(function HairIntelBrandPolish(){
  function installStyles(){
    if(document.getElementById('hairintel-brand-lockup-polish')) return;
    const style=document.createElement('style');
    style.id='hairintel-brand-lockup-polish';
    style.textContent=`
      .plum-v2 .pv2-wordmark{overflow:visible!important;text-decoration:none!important;background:transparent!important;border:0!important}
      .plum-v2 .hi-brand-lockup{display:inline-flex!important;align-items:center!important;gap:10px!important;min-width:0!important;max-width:100%!important;overflow:visible!important}
      .plum-v2 .hi-brand-mark-shell{position:relative!important;flex:0 0 auto!important;width:44px!important;height:44px!important;display:grid!important;place-items:center!important;border-radius:15px 15px 19px 19px!important;background:radial-gradient(circle at 32% 22%,rgba(255,246,222,.26),transparent 30%),linear-gradient(145deg,#563246 0%,#2d1724 58%,#1b0e16 100%)!important;border:1px solid rgba(231,201,145,.72)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 -8px 18px rgba(0,0,0,.18),0 8px 24px rgba(46,22,34,.18),0 0 0 3px rgba(200,155,89,.07)!important}
      .plum-v2 .hi-brand-mark-shell:before{content:""!important;position:absolute!important;inset:4px!important;border:1px solid rgba(255,232,184,.26)!important;border-radius:11px 11px 15px 15px!important;pointer-events:none!important}
      .plum-v2 .hi-brand-mark-shell:after{content:"✦"!important;position:absolute!important;top:-8px!important;right:-7px!important;width:18px!important;height:18px!important;display:grid!important;place-items:center!important;color:#ffe5ad!important;font:400 12px/1 Georgia,serif!important;text-shadow:0 0 5px #fff7d7,0 0 12px rgba(232,186,104,.92)!important;animation:hairintel-brand-sparkle 3.1s ease-in-out infinite!important}
      .plum-v2 .hi-brand-mark-shell img{position:relative!important;z-index:1!important;display:block!important;width:32px!important;height:32px!important;object-fit:contain!important;filter:brightness(1.14) contrast(1.03) drop-shadow(0 2px 5px rgba(0,0,0,.2))!important}
      .plum-v2 .hi-brand-lockup .pv2-wordmark-text{display:inline-block!important;min-width:0!important;color:inherit!important;font-family:"Bodoni Moda",Didot,"Bodoni MT",serif!important;font-weight:500!important;line-height:.92!important;letter-spacing:.095em!important;white-space:nowrap!important;text-shadow:none!important}
      .plum-v2 .pv2-logo .hi-brand-lockup .pv2-wordmark-text{color:#fff8f0!important;font-size:23px!important}
      .plum-v2 .pv2-top-brand .hi-brand-lockup .pv2-wordmark-text{color:#321a28!important;font-size:29px!important}
      .plum-v2 .hi-public-footer .hi-brand-lockup .pv2-wordmark-text{color:#321a28!important;font-size:23px!important}
      .plum-v2 .pv2-sparkle-i:before{top:-.78em!important;color:#f3c977!important}

      html.hi-authenticated .plum-v2 .pv2-logo{width:100%!important;max-width:100%!important;margin:8px 0 23px!important;padding:0 8px!important;box-sizing:border-box!important;overflow:visible!important}
      html.hi-authenticated .plum-v2 .pv2-logo .hi-brand-lockup{width:100%!important;max-width:100%!important;gap:8px!important;justify-content:flex-start!important}
      html.hi-authenticated .plum-v2 .pv2-logo .hi-brand-mark-shell{width:40px!important;height:40px!important;border-radius:13px 13px 17px 17px!important}
      html.hi-authenticated .plum-v2 .pv2-logo .hi-brand-mark-shell img{width:29px!important;height:29px!important}
      html.hi-authenticated .plum-v2 .pv2-logo .hi-brand-lockup .pv2-wordmark-text{font-size:21px!important;letter-spacing:.065em!important;transform:translateY(1px)!important}

      html.hi-authenticated .plum-v2 .pv2-hero{padding-top:32px!important;padding-bottom:12px!important;align-items:center!important}
      html.hi-authenticated .plum-v2 .pv2-copy{min-height:0!important;padding-top:12px!important;padding-bottom:24px!important}
      html.hi-authenticated .plum-v2 .pv2-copy>p:not(.pv2-eyebrow){margin-top:18px!important;margin-bottom:22px!important}
      html.hi-authenticated .plum-v2 .pv2-proof{margin-top:25px!important}
      html.hi-authenticated .plum-v2 .pv2-hero-photo{align-self:center!important;box-shadow:0 24px 62px rgba(51,30,38,.13)!important}

      html.hi-authenticated .plum-v2 .pv2-ghost{opacity:1!important;background:none!important;filter:none!important;mix-blend-mode:normal!important}
      html.hi-authenticated .plum-v2 .pv2-ghost:before{content:"HI"!important;display:block!important;position:fixed!important;left:calc(50% + 80px)!important;top:52%!important;transform:translate(-50%,-50%)!important;color:rgba(99,55,76,.105)!important;font:700 clamp(245px,29vw,430px)/.72 "Cormorant Garamond",Georgia,serif!important;letter-spacing:-.15em!important;white-space:nowrap!important;text-shadow:0 18px 46px rgba(151,91,77,.09)!important;pointer-events:none!important}
      html.hi-authenticated .plum-v2 .pv2-ghost:after{content:"HAIRINTEL"!important;display:block!important;position:fixed!important;left:calc(50% + 90px)!important;top:66%!important;transform:translateX(-50%)!important;color:rgba(99,55,76,.075)!important;font:700 clamp(32px,5vw,72px)/1 "Cormorant Garamond",Georgia,serif!important;letter-spacing:.12em!important;white-space:nowrap!important;pointer-events:none!important}

      html.hi-guest .plum-v2 .pv2-top-brand{display:inline-flex!important;align-items:center!important;overflow:visible!important}
      html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-lockup{gap:12px!important}
      html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-mark-shell{width:48px!important;height:48px!important}
      html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-mark-shell img{width:35px!important;height:35px!important}
      html.hi-guest .plum-v2 .pv2-top-brand .pv2-wordmark-text{font-size:clamp(27px,2.8vw,38px)!important;letter-spacing:.12em!important}

      .plum-v2.pv2-collapsed .pv2-logo .hi-brand-lockup{gap:0!important;justify-content:center!important}
      .plum-v2.pv2-collapsed .pv2-logo .hi-brand-lockup .pv2-wordmark-text{display:none!important}
      .plum-v2.pv2-collapsed .pv2-logo .hi-brand-mark-shell{width:42px!important;height:42px!important}

      @keyframes hairintel-brand-sparkle{0%,100%{opacity:.62;transform:scale(.86) rotate(0deg)}48%{opacity:1;transform:scale(1.16) rotate(8deg)}}
      @media(max-width:870px){
        .plum-v2 .pv2-top-brand .hi-brand-lockup{gap:8px!important}
        .plum-v2 .pv2-top-brand .hi-brand-mark-shell{width:38px!important;height:38px!important;border-radius:13px 13px 16px 16px!important}
        .plum-v2 .pv2-top-brand .hi-brand-mark-shell img{width:28px!important;height:28px!important}
        .plum-v2 .pv2-top-brand .hi-brand-lockup .pv2-wordmark-text{font-size:20px!important;letter-spacing:.095em!important}
        html.hi-authenticated .plum-v2 .pv2-hero{padding-top:22px!important;padding-bottom:6px!important}
        html.hi-authenticated .plum-v2 .pv2-copy{padding-top:8px!important;padding-bottom:20px!important}
        html.hi-authenticated .plum-v2 .pv2-ghost:before{left:50%!important;top:52%!important;color:rgba(99,55,76,.08)!important;font-size:clamp(190px,58vw,320px)!important}
        html.hi-authenticated .plum-v2 .pv2-ghost:after{left:50%!important;top:63%!important;color:rgba(99,55,76,.055)!important;font-size:clamp(28px,9vw,48px)!important}
      }
      @media(max-width:520px){html.hi-guest .plum-v2 .pv2-top-brand .hi-brand-mark-shell{width:36px!important;height:36px!important}.plum-v2 .pv2-top-brand .hi-brand-mark-shell img{width:26px!important;height:26px!important}html.hi-guest .plum-v2 .pv2-top-brand .pv2-wordmark-text{font-size:19px!important;letter-spacing:.09em!important}}
      @media(prefers-reduced-motion:reduce){.plum-v2 .hi-brand-mark-shell:after{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function lockupMarkup(){
    return `<span class="hi-brand-lockup"><span class="hi-brand-mark-shell" aria-hidden="true"><img src="public/hi-monogram.png?v=20260819-brand2" alt="" decoding="async"></span><span class="pv2-wordmark-text">HAIR<span class="pv2-sparkle-i">I</span>NTEL</span></span>`;
  }

  function polish(){
    installStyles();
    document.querySelectorAll('.plum-v2 .pv2-wordmark').forEach((brand)=>{
      if(brand.dataset.hiBrandPolished==='2') return;
      brand.dataset.hiBrandPolished='2';
      brand.innerHTML=lockupMarkup();
      brand.setAttribute('aria-label','HairIntel');
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',polish); else polish();
  window.addEventListener('pageshow',polish);
})();