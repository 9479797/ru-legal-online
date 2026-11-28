(function(root){
 const widestLabel=(options,measure)=>Math.max(0,...Array.from(options,o=>measure(o.label||o.textContent||'')));
 function fit(){
  const ctx=document.createElement('canvas').getContext('2d');if(!ctx)return;
  document.querySelectorAll('.fields select').forEach(select=>{
   const style=getComputedStyle(select);ctx.font=style.font||style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
   const content=widestLabel(select.options,text=>ctx.measureText(text).width);
   const extra=['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((n,k)=>n+(parseFloat(style[k])||0),18);
   select.style.width=Math.ceil(content+extra)+'px';
  });
 }
 root.SettingsLayout={fit,widestLabel};
})(window);
