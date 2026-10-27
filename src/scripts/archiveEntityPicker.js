import {searchArchiveChoices} from '../lib/archiveSelection.mjs';
import {archiveInteractionCopy} from '../lib/archiveInteractionCopy.mjs';

let pickerId=0;
export function createArchiveEntityPicker(field,{items,locale='zh',multiple=false,max=multiple?100:1,onChange=()=>{},label}={}){
 const doc=field.ownerDocument,view=doc.defaultView,c=archiveInteractionCopy(locale),required=field.required;
 const make=(tag,text)=>{const node=doc.createElement(tag);if(text)node.textContent=text;return node;};
 const host=make('div'),chips=make('div'),input=make('input'),list=make('div'),notice=make('span');
 host.className='archive-picker';chips.className='archive-picker__selection';list.className='archive-picker__options';notice.className='archive-picker__notice';
 const id='archive-picker-'+(++pickerId);list.id=id;list.hidden=true;list.setAttribute('role','listbox');
 input.type='search';input.autocomplete='off';input.placeholder=c.chooseHint;input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-label',label || field.getAttribute('aria-label') || field.labels?.[0]?.childNodes[0]?.textContent?.trim() || c.choose);
 input.dataset.pickerSearch='';input.required=required;notice.setAttribute('role','status');
 field.hidden=true;field.required=false;field.removeAttribute('list');field.after(host);host.append(chips,input,list,notice);
 let catalogue=items || [],values=[],suggestions=[],active=-1,disposed=false;
 const read=()=>field.value.trim().split(multiple?/\s+/:/\n/).filter(Boolean);
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
 function changed(){field.value=values.join(multiple?'\n':'');field.dispatchEvent(new view.Event('input',{bubbles:true}));field.dispatchEvent(new view.Event('change',{bubbles:true}));onChange([...values]);}
 function draw(){
  chips.replaceChildren();for(const value of values){const item=catalogue.find(row=>row.id===value),chip=make('span');chip.className='archive-picker__chip';
   if(item?.image){const image=make('img');image.src=item.image;image.alt='';image.loading='lazy';chip.append(image);}
   chip.append(make('span',item?.title || value));const remove=make('button','×');remove.type='button';remove.setAttribute('aria-label',c.remove+' '+(item?.title || value));remove.addEventListener('click',()=>{values=values.filter(id=>id!==value);changed();draw();input.focus();});chip.append(remove);chips.append(chip);
  }
  input.required=required && !values.length;input.setCustomValidity('');input.disabled=field.disabled || values.length>=max;notice.textContent=values.length>=max?c.limit:'';
 }
 function choose(item){if(values.includes(item.id) || values.length>=max)return;values=multiple?[...values,item.id]:[item.id];input.value='';close();changed();draw();if(!input.disabled)input.focus();}
 function search(){
  suggestions=searchArchiveChoices(catalogue,input.value,values);active=-1;list.replaceChildren();
  for(const [index,item]of suggestions.entries()){const option=make('div');option.id=id+'-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.className='archive-picker__option';
   if(item.image){const image=make('img');image.src=item.image;image.alt='';image.loading='lazy';option.append(image);}
   const caption=make('span');caption.append(make('strong',item.title),make('small',item.type));option.append(caption);option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>choose(item));list.append(option);
  }
  if(!suggestions.length)list.append(make('p',c.noMatches));list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
 }
 input.addEventListener('input',event=>{if(!event.isComposing){input.setCustomValidity(input.value.trim()?c.chooseValid:'');search();}});input.addEventListener('compositionend',()=>{input.setCustomValidity(input.value.trim()?c.chooseValid:'');search();});input.addEventListener('focus',search);
 input.addEventListener('keydown',event=>{
  if(event.isComposing)return;
  if(event.key==='Escape'){event.preventDefault();close();}
  if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();if(list.hidden)search();if(!suggestions.length)return;active=(active+(event.key==='ArrowDown'?1:-1)+suggestions.length)%suggestions.length;[...list.children].forEach((node,index)=>node.setAttribute('aria-selected',String(index===active)));input.setAttribute('aria-activedescendant',id+'-'+active);}
  if(event.key==='Enter' && !list.hidden){event.preventDefault();const item=suggestions[active] || suggestions.find(row=>[row.id,row.title,...(row.terms || [])].some(term=>term.toLowerCase()===input.value.toLowerCase()));if(item)choose(item);else{input.setCustomValidity(c.chooseValid);input.reportValidity();}}
 });
 const outside=event=>{if(!host.contains(event.target))close();};doc.addEventListener('pointerdown',outside);
 host.addEventListener('focusout',()=>view.setTimeout(()=>{if(!host.contains(doc.activeElement))close();},0));
 const refresh=()=>{if(disposed)return;values=[...new Set(read())].slice(0,max);input.value='';close();draw();};
 const reset=()=>view.setTimeout(refresh,0);field.form?.addEventListener('reset',reset);
 const submit=event=>{if(input.value.trim()){event.preventDefault();event.stopImmediatePropagation();input.setCustomValidity(c.chooseValid);input.reportValidity();input.focus();}};field.form?.addEventListener('submit',submit,true);
 field.addEventListener('archive-picker-refresh',refresh);refresh();
 return {input,host,refresh,setItems(next){catalogue=next;refresh();},setValues(next,{notify=true}={}){values=[...new Set(next)].slice(0,max);field.value=values.join(multiple?'\n':'');input.value='';close();draw();if(notify)changed();},destroy(){disposed=true;doc.removeEventListener('pointerdown',outside);field.form?.removeEventListener('reset',reset);field.form?.removeEventListener('submit',submit,true);field.removeEventListener('archive-picker-refresh',refresh);host.remove();field.hidden=false;field.required=required;}};
}
