import lexer from "./spec-lexer"
import {Parser} from "./spec-parser"
import esSource from "./es.spec"
import dsSource from "./ds.spec"

const getSpec = (source) => {
    const context = {
        literal(value) {
              return JSON.parse(`{"type": "literal", "value": ${value}}`);
        },
        obj(twoples) {
            const o = {};
            for (const [key, value] of twoples) {
                o[key] = value;
            }

            return o;
        },
        get parser() {
            return parser;
        }
    };

    const parser = new Parser({context});

    for (const token of lexer.tokenize(source)) {
        if (token.type !== 'ws') {
            parser.push(token);
        }
    }
    
    return parser.finish();
};

const compute = (spec, type) => {
    const obj = {};
    const {base, props} = spec[type];
    
    for (const superType of base) {
        Object.assign(obj, compute(spec, superType));
    }
    
    Object.assign(obj, props);
    
    return obj;
}


export default (type, verify = false, locate = () => null) => {
    const obj = {};
    const excepted = new Set(['type', 'loc']);
    const spec = getSpec(type === 'es' ? esSource : dsSource);
          
    let i = 1;
    
    for (const key in spec) {
        const def = spec[key];
        
        if (def.kind === 'interface') {
            const completeDef = verify ? compute(spec, key) : null; 
            
            obj[key] = function(fill) {                
                this.type = key;
                this.loc = locate();
                
                if (verify) {
                    for (const prop in completeDef) {
                        if (!fill.hasOwnProperty(prop)) {
                            if (!excepted.has(prop))
                                throw new Error(`Property "${prop}" expected but not found for type ${key}`);
                        } else
                            this[prop] = fill[prop];
                    }
                } else {
                    Object.assign(this, fill);
                }
                
            }
        }
    }
    
    return obj;
}