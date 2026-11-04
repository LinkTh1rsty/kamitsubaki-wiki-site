import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {computed} from 'vue'
const exports={}
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../app/composables/useStablePhotoWindow.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,computed})
export const stableWindow=exports.useStablePhotoWindow
