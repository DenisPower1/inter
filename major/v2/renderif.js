import{

    syErr,
    ParserWarning,
    isFalse,
    isObj,
    

} from "./helpers"




export function renderIf(obj){

    // This function is a replacement
    // for Inter.renderIf()
    // Inter.renderIf() was removed since version 2.0.0.

    if(!isObj(obj)){


        syErr(`
        
        The argument of renderIf must be a plain object.
        
        `)

    }

    if(new.target!=void 0){

        syErr(`
        
        renderIf is not a constructor.
        
        `)


    }else{

        const{
            in:IN,
            cond,
            react,
        }=obj;

        let index=-1;
        const theContainer=getId(IN);
        const children=theContainer.children;
        const els=new Set();


        function deepIfs(el){

            
            

                //Nested children.

                const nodes=el.childNodes;

                let _index=-1;
                for(let node of nodes ){

                    if(node.nodeType==1){

                    _index++;
                    }

                    if(node.hasChildNodes()){

                        deepIfs(node);

                    }

                    const setting={
                        target:node,
                        if:void 0,
                        else:void 0,
                        i:_index,
                        root:node.parentNode,
                    }

                    

                    if(node.nodeType==1){

                    

                        let sibling=node.nextElementSibling;

                        
                        if(node.hasAttribute("_else") && !node.hasAttribute("_if")){


                ParserWarning(`
                                
                It was found an element with an "_else" attribute,
                but there is not an element by attribute "_if" before it.

                `)

                       }

                        if(node.hasAttribute("_if")){

                            
                            if(node.hasAttribute("_else")){

                                ParserWarning(`
                                
                                It was found an element which has simultaneousilly
                                the "_if" and "_else" attribute. It's forbidden.
                                
                                `)
            
                                return false;
            
                            }
                            setting.if=node.getAttribute("_if");
                            node.removeAttribute("_else");

                            
                     
                    
                        }

              if(sibling && sibling.hasAttribute("_else")){


                
                if(sibling.hasAttribute("_if")){
            
                    ParserWarning(`
                    
                    It was found an element which has simultaneousilly
                    the "_if" and "_else" attribute. It's forbidden.
                    
                    `)
                    return false;
                }

                
                            
                            setting.else=sibling;

                            sibling.removeAttribute("_else");

            


                        }if(setting.if){

                            els.add(setting);

                        }






                    }

            

            }
            

        }

        for(let child of children){

            index++;

            const setting={
                target:child,
                if:void 0,
                else:void 0,
                i:index,
                root:theContainer
            }


           const sibling=child.nextElementSibling;
            
            if(child.hasChildNodes()){

                deepIfs(child)
                

            }

            if(child.hasAttribute("_else") && !child.hasAttribute("_if")){


                ParserWarning(`
                                
                It was found an element with an "_else" attribute,
                but there is not an element by attribute "_if" before it.

                `)

                return false;

            }
            

             if(child.hasAttribute("_if")){
             
                if(child.hasAttribute("_else")){

                    ParserWarning(`
                    
                    It was found an element which has simultaneousilly
                    the "_if" and "_else" attribute. It's forbidden.
                    
                    `)

                    return false;

                }

                setting.if=child.getAttribute("_if");
                child.removeAttribute("_if");
                
                

            }  if(sibling && sibling.hasAttribute("_else")){


                
                if(sibling.hasAttribute("_if")){

                    ParserWarning(`
                    
                    It was found an element which has simultaneousilly
                    the "_if" and "_else" attribute. It's forbidden.
                    
                    `)

                    return false;
                }

                setting.else=sibling;
                sibling.removeAttribute("_else");

   


            } if(setting.if){

                els.add(setting)


                

            }

        }


        const reactor=parseConditionalRendering(cond,els);

        

        return reactor;
    }

    



}


function parseConditionalRendering(cond,els){

    const toArray=array.create(els);

    function run(){

        for(let el of toArray){

            const{
                target,
                if:IF,
                else:ELSE,
                i,
                root
            }=el;

            

            if(isFalse(cond[IF])){

                
                

              if(target.parentNode==root && !ELSE){   

             root.removeChild(target)

             

              }else if(ELSE){

                if(root.children[i] && root.children[i].isSameNode(ELSE)){

                }else{

                    if(target.parentNode==root){

                root.replaceChild(ELSE,target);

                    }

                }

              }



            }else{
                
                
                 if(root.children[i]){

                    const el=root.children[i];

                    
                     if(el.isSameNode(target)){
                       
                        // No need to update the interface.
                        
                    }
                    else if(ELSE && ELSE.parentNode!=null){

                        

                        root.replaceChild(target,ELSE)

                        

                    }
                    
                    else{

                    root.insertBefore(target,el);

                    }

                } 
         

                else{

                    root.appendChild(target)

                }


            }


    

    }
    
}

run();

const reactor=new Proxy(cond,{

    set(...args){

        if(!(args[1] in cond)){
 
            

            return false;

        }

        Reflect.set(...args)

        run();

        if(observer.has(args[1])){



            observer.get(args[1]).call({

                stopObserving(){

                    observer.delete(args[1])

                }

            }, args[2]);

        }

    },

    deleteProperty(...args){

        

    }

})

const observer=new Map();

Object.defineProperty(reactor, "observe",{

    value(prop, fn){

        if(observer.has(prop)){

            return false;
        }

        else if(!(prop in this)){

            consW(`
            
            "${prop}" is not a conditional property.

            `)

        }else if(typeof fn!=="function"){

            consW(`
            
           The second argument of [renderIf reactor].observe(),
           must be a function.
            
            `)

        }else{

                observer.set(prop, fn);

        }

    },
    enumerable:!1,
    configurable:!1

})

return reactor;

}
