# templates/setup/

## Responsibility

棣栨杩愯寮曞鏈嶅姟锛團irst-run Setup Service锛夛細璐熻矗鎶婄帺瀹跺湪娴忚鍣ㄥ紩瀵奸〉涓婂仛鐨勯€夋嫨锛堟湇鍔″晢/API key銆丄I 浜烘牸銆佹寜瑙掕壊妯″瀷鍒嗛厤锛夊啓鍏?opencode 鐨勪究鎼洪厤缃洰褰曪紝骞堕獙璇?API key 鏈夋晥鎬с€傛槸 QDIP "棣栨閰嶇疆"浣撻獙鐨勫畬鏁翠笁灞傚疄鐜帮細

- `config-writer.js` 鈥?閰嶇疆鍐欏叆鍣紙Service/DAO 灞傦級锛氱函 Node 妯″潡锛屾棤 HTTP 渚濊禆锛屽皝瑁呭叏閮ㄦ枃浠跺啓鍏ラ€昏緫涓?provider 鍏冩暟鎹?- `guide-server.js` 鈥?鏈湴寮曞 HTTP 鏈嶅姟鍣紙Controller 灞傦級锛氭彁渚?REST API 绔偣涓?setup 鐩綍闈欐€佹枃浠舵湇鍔★紝涓氬姟濮旀墭缁?`config-writer.js`
- `first-run.html` 鈥?寮曞椤靛墠绔紙View 灞傦級锛氬崟鏂囦欢銆佹棤澶栭儴渚濊禆銆佸畬鍏ㄧ绾胯繍琛岀殑缁堢椋庢牸閰嶇疆 UI

## Design

- **鍒嗗眰鏋舵瀯锛圕ontroller/Service/View锛?*锛歚guide-server.js` 鏄杽 HTTP 澹筹紙璺敱 + JSON 缂栬В鐮侊級锛屾墍鏈変笟鍔￠€昏緫闆嗕腑鍦?`config-writer.js`锛沗first-run.html` 鍙仛浜や簰涓庡睍绀猴紝閫氳繃 fetch 璋?API銆備笁鑰呴€氳繃 `setup` 鐩綍鐩稿浣嶇疆鑰﹀悎骞剁敱 `tools/build.ps1` 鏁翠綋澶嶅埗銆?- **鍏冩暟鎹┍鍔ㄩ厤缃紙Metadata-Driven Registry锛?*锛歚PROVIDERS` 闈欐€佽〃璁板綍鏈嶅姟鍟嗗叧閿樊寮傗€斺€擿builtin`锛堟槸鍚﹀湪 opencode 鍐呯疆娉ㄥ唽琛級鍐冲畾鍐欏叆绛栫暐锛氬唴缃?provider锛坉eepseek/openai锛夊彧闇€鍐?`auth.json` 鍗崇敓鏁堬紱闈炲唴缃?provider锛坘imi/moonshot锛夐渶鍦?`opencode.json` 鐨?`providers` 娈垫敞鍐屼负 `{ npm: '@ai-sdk/openai-compatible', options: { baseURL } }`銆傝缁撹鍩轰簬 opencode 1.18.25 瀹炴祴锛堟敞閲婃爣娉ㄨ瘉鎹潵婧愶級銆?- **璺緞鏄犲皠琛紙Path Mapping锛?*锛歚AGENT_MODEL_PATHS` 鎶婂墠绔?agent 閿紙`orchestrator`/`oracle`/`fixer`/鈥?`council-alpha`锛夋槧灏勫埌 `oh-my-opencode-slim.json` 鍐呯殑娣卞眰璺緞锛沗COUNCIL_SEATS` 璐熻矗璁細甯綅鍚屾椂鍐欏叆 `council.presets.default` 涓?`council.presets.synthesizer` 涓ゅ銆俙setPath()` 鎻愪緵鎸夎矾寰勬暟缁勭殑娣卞啓宸ュ叿锛堥伩鍏嶆墜鍐欏祵濂楄祴鍊硷級銆?- **閮ㄥ垎瑕嗙洊鍘熷垯锛圥artial Override锛?*锛歚configure()` 鍙敼鍐欑帺瀹舵樉寮忛€夋嫨鐨勯」鈥斺€攁gentModels 浠呰鐩栨寚瀹?agent銆乸ersona 涓?`default` 鏃朵笉鍐欎换浣曟枃浠躲€侀潪鍐呯疆 provider 鎵嶆敞鍏?`providers` 娈碉紱鏈€変腑鐨?agent 涓庡叾瀹冮厤缃瓧娈典繚鎸佹ā鏉垮師鍊硷紙娴嬭瘯涓撻棬鏂█姝よ涓猴級銆?- **鍝ㄥ叺涓?IPC 鏂囦欢锛圫entinel + IPC锛?*锛氬惎鍔ㄦ椂鍐?`data\.guide-url` 閫氱煡鍚姩鍣紙绔彛 + 寮曞椤?URL锛夛紱閰嶇疆瀹屾垚鍐?`data\.configured` 鏍囪锛堝惈鏃堕棿鎴充笌鏈嶅姟鍟嗗垪琛級锛屼緵 `鍚姩.bat` 鍋氶娆¤繍琛岄棬鎺с€?- **闃插尽鎬х紪绋嬶紙Defensive锛?*锛氶潤鎬佹枃浠舵湇鍔＄敤 `path.basename` 褰掍竴鍖栬矾寰勶紝闃茬洰褰曠┛瓒婏紙娴嬭瘯鏈変笓闂ㄧ敤渚嬶級锛汚PI 鍏ㄩ儴 try/catch 杩斿洖 `{ ok:false, error }` JSON锛屽墠绔?`friendlyError()` 鍐嶅仛鐜╁鍙缈昏瘧銆?- **鏃犲閮ㄤ緷璧栵紙Zero-Dependency锛?*锛氫粎鐢?`node:http`/`node:fs`/`node:path` 鍐呭缓妯″潡锛屽紩瀵奸〉闆跺閮?CDN 寮曠敤鈥斺€斾繚璇佸垎鍙戝寘绂荤嚎鍙敤銆?- **琛屼负濂戠害鐢?node:test 娴嬭瘯閿佸畾**锛歚config-writer.test.js` 鏂█ auth.json 鏍煎紡锛坄{ provider: { type:'api', key } }`锛屽瓧娈靛悕鏄?`key` 闈?`apiKey`锛夈€乥uiltin/闈?builtin 娉ㄥ叆宸紓銆乸ersona.md 鍐欏叆涓?`instructions` 杩藉姞銆乤gentModels 閮ㄥ垎瑕嗙洊涓?council 鍙岄璁惧啓鍏ワ紱`guide-server.test.js` 鐢?`spawn` 鐪熷疄鍚姩鏈嶅姟鍣ㄦ柇瑷€ `.guide-url` 鍐欏叆銆乣/api/status`銆乣/api/test` 缁撴瀯銆佽矾寰勭┛瓒婇槻鎶や笌 persona+agentModels 绔埌绔惤鐩樸€?
## Flow

**寮曞鏈嶅姟鍚姩锛坓uide-server.js锛?*锛?
```
鍚姩.bat spawn: node setup/guide-server.js <ROOTS>
  鈫?root = path.resolve(argv[2])锛堝惎鍔ㄥ櫒浼犲叆鏃犲熬鍙嶆枩鏉犲舰鎬侊級
  鈫?http.createServer 鐩戝惉 127.0.0.1:0锛堥殢鏈虹鍙ｏ級
  鈫?鐩戝惉鍥炶皟锛歮kdir data\ 鈫?鍐?data\.guide-url = http://127.0.0.1:<port>/setup/first-run.html
  鈫?鍚姩鍣ㄨ疆璇㈣鍒?.guide-url 鍚?start 鎵撳紑娴忚鍣?```

**閰嶇疆浜や簰锛堟祻瑙堝櫒 鈫?API 鈫?纾佺洏锛?*锛?
```
first-run.html 鍔犺浇
  鈫?GET /api/status 鈫?{ ok, providers: PROVIDERS, models: AVAILABLE_MODELS, configured }
  鈫?娓叉煋鏈嶅姟鍟嗗崱鐗囷紱鑻?configured=true 鏄剧ず"宸插瓨鍦ㄩ厤缃?璀﹀憡
鐜╁鍕鹃€夋湇鍔″晢 鈫?绮樿创 API key 鈫?POST /api/test { provider, apiKey }
  鈫?testConnection()锛歠etch <baseUrl>/models锛孉uthorization: Bearer <key>锛孉bortSignal.timeout(10s)
  鈫?401 鈫?"API key 鏃犳晥锛?01锛?锛?02 鈫?"浣欓涓嶈冻锛?02锛?锛涘叾浠栭潪 2xx 鈫?"HTTP <code>"锛涘紓甯?鈫?"缃戠粶閿欒: <msg>"
  鈫?鍓嶇 state[name] = 閫氳繃娴嬭瘯鐨?key锛坘ey 琚敼鍔ㄥ嵆浣滃簾娴嬭瘯缁撴灉锛岄槻淇濆瓨鏈獙璇?key锛?鐜╁锛堝彲閫夛級閫変汉鏍?鍒嗛厤妯″瀷 鈫?POST /api/configure { providers, persona, personaText, agentModels }
  鈫?configure({ root, ... })锛?      1) 鍐?opencode\auth\opencode\auth.json锛堟瘡涓湇鍔″晢 { type:'api', key }锛?      2) 鏀瑰啓 opencode\config\opencode\opencode.json锛堜粎娉ㄥ叆闈?builtin provider锛?      2b) persona 鈮?default 鏃讹細鍐?opencode\config\opencode\instructions\persona.md锛?          骞跺悜 cfg.instructions 杩藉姞鐩稿璺緞 'opencode/config/opencode/instructions/persona.md'
          锛堢浉瀵硅矾寰勪互 CWD=鍖呮牴涓哄熀鍑嗭紝鍚姩鍣?cd /d "%~dp0" 淇濊瘉锛?      2c) agentModels 闈炵┖鏃讹細鎸?AGENT_MODEL_PATHS 鏀瑰啓 oh-my-opencode-slim.json锛?          璁細甯綅鍚屾鍐?council.presets.synthesizer
      3) 鍐?data\.configured锛堝摠鍏碉級
  鈫?鍝嶅簲 { ok:true } 鈫?鍓嶇鏄剧ず"閰嶇疆瀹屾垚" 鈫?鐜╁鍏抽棴椤甸潰閲嶅紑 鍚姩.bat
```

**闈欐€佽祫婧?*锛歚GET /setup/<file>` 鈫?`path.join(setupDir, path.basename(rel))`锛屼粎闄?setup 鐩綍鍐呮枃浠讹紝MIME 鎸夋墿灞曞悕鏄犲皠锛坔tml/js/css锛夛紝鍏朵綑 404銆?
## Integration

- **琚皟鐢ㄦ柟**锛歚guide-server.js` 琚?`鍚姩.bat` 浠?`node.exe setup\guide-server.js <ROOTS>` 褰㈠紡 spawn锛堟渶灏忓寲绐楀彛锛屼粎棣栨鏈厤缃椂锛夛紱`config-writer.js` 琚?`guide-server.js` require锛坄configure`/`testConnection`/`PROVIDERS`/`AVAILABLE_MODELS`锛夛紝骞朵綔涓虹函妯″潡琚?`config-writer.test.js` 鐩存帴瀵煎叆娴嬭瘯銆?- **瀵瑰 API 绔偣锛坒irst-run.html 娑堣垂锛?*锛?  - `GET /api/status` 鈥?鏈嶅姟鍟嗗厓鏁版嵁銆佸彲鍒嗛厤妯″瀷鍒楄〃銆佹槸鍚﹀凡閰嶇疆
  - `POST /api/test` 鈥?鍗曟湇鍔″晢 API key 杩為€氭€ф祴璇曪紙浠ｇ悊鍒版ā鍨嬫湇鍔″晢 `GET /models`锛?  - `POST /api/configure` 鈥?涓€娆℃€ф彁浜ゅ叏閮ㄩ厤缃苟钀界洏
- **璇诲啓鏂囦欢锛坥pencode 渚挎惡鐩綍绾﹀畾锛?*锛歚opencode\auth\opencode\auth.json`銆乣opencode\config\opencode\opencode.json`銆乣opencode\config\opencode\oh-my-opencode-slim.json`銆乣opencode\config\opencode\instructions\persona.md`銆乣data\.configured`銆乣data\.guide-url`銆傝繖浜涜矾寰勪笌 `鍚姩.bat` 鐨?`XDG_CONFIG_HOME`/`XDG_DATA_HOME` 閲嶅畾鍚戜竴鑷达紙opencode 鍦?XDG 涓嬭嚜鍔ㄨ拷鍔?`opencode` 娈碉級銆?- **涓婃父妯℃澘渚濊禆**锛歚configure()` 鍋囧畾 `opencode.json` 涓?`oh-my-opencode-slim.json` 宸叉寜妯℃澘瀛樺湪浜?`opencode\config\opencode\`锛堣鍙栧悗鏀瑰啓锛夛紱娴嬭瘯閫氳繃 `makeRoot()`/`makeConfigureRoot()` 浠?templates 鏍圭洰褰曞鍒舵ā鏉挎潵妯℃嫙璇ュ墠缃潯浠躲€?- **鏋勫缓闆嗘垚**锛歚tools/build.ps1` 灏?`templates\setup\*`锛堝惈 `.test.js`锛夋暣浣撳鍒跺埌鍒嗗彂鐩綍 `setup\`锛沗first-run.html` 鐨?URL 鍓嶇紑 `/setup/` 涓庝箣瀵瑰簲銆?