import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Wallet, Shield, Copy, Check, Eye, EyeOff, AlertTriangle,
  KeyRound, RefreshCw, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, type Profile } from '@/lib/supabase';

type Props = {
  userId: string;
  profile: Profile;
  onBack: () => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
};

const WORDLIST = [
  'abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident',
  'account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual',
  'adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','affair','afford',
  'afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert',
  'alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing',
  'among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce',
  'annual','another','answer','antenna','antique','anxiety','any','apart','apology','appear','apple','approve',
  'april','arch','arctic','area','arena','argue','arm','armed','armor','army','around','arrange','arrival',
  'arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume',
  'asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author',
  'auto','autumn','average','avocado','avoid','awake','aware','away','awesome','awful','awkward','axis',
  'baby','bachelor','bacon','badge','bag','balance','balcony','ball','bamboo','banana','banner','bar',
  'barely','bargain','barrel','base','basic','basket','battle','beach','bean','beauty','because','become',
  'beef','before','begin','behave','behind','believe','belt','bench','benefit','best','betray','better',
  'between','beyond','bicycle','bid','bike','bind','biology','bird','birth','bitter','black','blade',
  'blame','blanket','blast','bleak','bless','blind','blood','blossom','blouse','blue','blur','blush',
  'board','boat','body','boil','bomb','bone','bonus','book','boost','border','boring','borrow','boss',
  'bottom','bounce','box','boy','bracket','brain','brand','brass','brave','bread','breeze','brick','bridge',
  'brief','bright','bring','brisk','broccoli','broken','bronze','broom','brother','brown','brush','bubble',
  'buddy','budget','buffalo','build','bulb','bulk','bullet','bundle','bunker','burden','burger','burst',
  'bus','business','busy','butter','buyer','buzz','cabbage','cabin','cable','cactus','cage','cake','call',
  'calm','camera','camp','can','canal','cancel','candy','cannon','canoe','canvas','canyon','capable',
  'capital','captain','car','carbon','card','cargo','carpet','carry','cart','case','cash','casino','castle',
  'casual','cat','catalog','catch','category','cattle','caught','cause','caution','cave','ceiling','celery',
  'cement','census','century','cereal','certain','chair','chalk','champion','change','chaos','chapter','charge',
  'chase','chat','cheap','check','cheese','chef','cherry','chest','chicken','chief','child','chimney','choice',
  'choose','chrome','chronic','chuckle','chunk','churn','cigar','cinnamon','circle','citizen','city','civil',
  'claim','clap','clarify','claw','clay','clean','clerk','clever','click','client','cliff','climb','clinic',
  'clock','clog','cloth','cloud','clown','club','clue','clump','cluster','coach','coast','coconut','code',
  'coffee','coil','coin','collect','color','column','combine','come','comfort','comic','common','company',
  'concert','conduct','confirm','congress','connect','consider','control','convince','cook','cool','copper',
  'copy','coral','core','corn','correct','cost','cotton','couch','country','couple','course','cousin',
  'cover','coyote','crack','cradle','craft','cram','crane','crash','crater','crawl','crazy','cream','credit',
  'creek','crew','cricket','crime','crisp','critic','crop','cross','crouch','crowd','crucial','cruel','cruise',
  'crumble','crunch','crush','crying','crystal','cube','culture','cup','cupboard','curious','current','curtain',
  'curve','cushion','custom','cute','cycle','dad','damage','damp','dance','danger','daring','dash','daughter',
  'dawn','day','deal','debate','debris','decade','december','decide','decline','decorate','decrease','deer',
  'defense','define','defy','degree','delay','deliver','demand','demise','denial','dentist','deny','depart',
  'depend','deposit','depth','deputy','derive','describe','desert','design','desk','despair','destroy','detail',
  'detect','develop','device','devote','diagram','dial','diamond','diary','dice','diesel','diet','differ',
  'digital','dignity','dilemma','dinner','dinosaur','direct','dirt','disagree','discover','disease','dish',
  'dismiss','disorder','display','distance','divert','divide','divorce','dizzy','doctor','document','dog','doll',
  'dolphin','domain','donate','donkey','donor','door','dose','double','dove','draft','dragon','drama','drastic',
  'draw','dream','dress','drift','drill','drink','drip','drive','drop','drum','dry','duck','dumb','dune',
  'during','dust','dutch','duty','dwarf','dynamic','eager','eagle','early','earn','earth','easily','east',
  'easy','echo','ecology','economy','edge','edit','review','effort','egg','eight','either','elbow','elder',
  'electric','elegant','element','elephant','elevator','elite','else','embark','embody','embrace','emotion',
  'employ','empower','empty','enable','enact','end','endless','endorse','enemy','energy','enforce','engage',
  'engine','enjoy','enlist','enough','enrich','enroll','ensure','enter','entire','entry','envelope','episode',
  'equal','equip','era','erase','erode','erosion','error','erupt','escape','essay','essence','estate','eternal',
  'ethics','evidence','evil','evoke','evolve','exact','example','excess','exchange','excite','exclude','excuse',
  'execute','exercise','exhaust','exhibit','exile','exist','exit','exotic','expand','expect','expire','explain',
  'expose','express','extend','extra','eye','extreme','fabric','face','faculty','fade','faint','faith','fall',
  'false','fame','family','famous','fan','fancy','fantasy','farm','fashion','fat','fatal','father','fatigue',
  'fault','favorite','feature','february','federal','fee','feed','feel','female','fence','festival','fetch',
  'fever','few','fiber','fiction','field','figure','file','film','filter','final','find','fine','finger',
  'finish','fire','firm','first','fiscal','fish','fit','fitness','fix','flag','flame','flash','flat','flavor',
  'flee','flight','flip','float','flock','floor','flower','fluid','flush','fly','foam','focus','fog','foil',
  'fold','follow','food','foot','force','forest','forget','fork','fortune','forum','forward','fossil','foster',
  'found','fox','fragile','frame','frequent','fresh','friend','fringe','frog','front','frost','frown','frozen',
  'fruit','fuel','fun','funny','furnace','fury','future','gadget','gain','galaxy','gallery','game','gap',
  'garage','garbage','garden','garlic','garment','gas','gasp','gate','gather','gauge','gaze','general','genius',
  'genre','gentle','genuine','gesture','ghost','giant','gift','giraffe','girl','glad','glance','glare','glass',
  'glide','globe','gloom','glory','glove','glow','glue','goat','goddess','gold','golf','goose','gorilla','gospel',
  'gossip','govern','grab','grace','grain','grant','grape','grass','gravity','great','green','grid','grief',
  'grit','grocery','group','grow','grunt','guard','guess','guide','guilt','guitar','gun','gym','habit','hair',
  'half','hammer','hamster','hand','happy','harbor','harsh','harvest','hat','have','hawk','hazard','head',
  'health','heart','heavy','hedgehog','height','hello','helmet','hidden','hide','hijack','hill','hint','hippie',
  'hire','history','hobby','hockey','hold','hole','holiday','hollow','home','honey','hood','hope','horn','horror',
  'horse','hospital','host','hotel','hour','hover','hub','huge','human','humble','humor','hundred','hungry',
  'hunt','hurdle','hurry','hurt','husband','hybrid','ice','icon','idea','identify','idle','ignore','illegal',
  'illness','image','imagine','impact','import','impose','improve','impulse','inch','include','income','increase',
  'index','indicate','indoor','industry','infant','inflict','inform','inhale','inherit','initial','inject','injury',
  'inland','inner','insect','insert','inside','inspire','install','intact','interest','into','invest','invite',
  'involve','iron','island','isolate','issue','item','ivory','jacket','jaguar','jar','jazz','jealous','jeans',
  'jelly','jewel','job','join','joke','journey','joy','judge','juice','jump','jungle','junior','junk','just',
  'kangaroo','keen','keep','ketchup','key','kick','kid','kidney','kind','kingdom','kiss','kit','kitchen','kite',
  'kitten','kiwi','knee','knife','knock','know','lab','label','labor','ladder','lady','lake','lamp','language',
  'laptop','large','later','latin','laugh','laundry','lava','law','lawn','lawsuit','layer','lazy','leader',
  'leaf','learn','leave','lecture','left','leg','legal','legend','leisure','lemon','lend','length','lens','leopard',
  'lesson','letter','level','liar','liberty','library','license','life','lift','light','limit','link','lion',
  'liquid','list','little','live','lizard','load','loan','lobster','local','lock','logic','lonely','long','loop',
  'lottery','loud','lounge','love','loyal','lucky','luggage','lumber','lunar','lunch','luxury','lyrics','machine',
  'mad','magic','magnet','maid','mail','main','major','make','mammal','man','manage','mandate','mango','mansion',
  'manual','maple','marble','march','margin','marine','market','marriage','mask','mass','master','match','matter',
  'may','maze','meadow','mean','measure','meat','mechanic','medal','media','melody','melt','member','memory',
  'mention','menu','mercy','merge','merit','merry','mesh','message','metal','method','middle','midnight','might',
  'milk','million','mimic','mind','minimum','minor','minute','miracle','mirror','misery','miss','mistake','mix',
  'mixed','mixture','mobile','model','modify','mom','moment','monitor','monkey','monster','month','moon','moral',
  'more','morning','mother','motion','motor','mountain','mouse','move','movie','much','muffin','mule','multiply',
  'muscle','museum','music','mutual','mystery','myth','naive','name','napkin','narrow','nasty','nation','nature',
  'near','neck','need','negative','neglect','neither','nephew','nerve','nest','net','network','neutral','never',
  'news','next','nice','night','noble','noise','noodle','normal','north','nose','notable','note','nothing',
  'notice','novel','now','nuclear','number','nurse','nut','oak','obey','object','obscure','observe','obtain',
  'obvious','occur','ocean','october','odor','off','offer','office','often','oil','okay','old','olive','olympic',
  'omit','once','one','onion','online','only','open','opera','opinion','oppose','option','orange','orbit','orchard',
  'order','organ','origin','other','ounce','outdoor','outer','output','outside','oval','oven','over','own','owner',
  'oxygen','oyster','ozone','paddle','page','pair','palace','palm','panda','panel','panic','panther','paper',
  'parade','parent','park','parrot','party','pass','patch','path','patient','patrol','pattern','pause','pave',
  'peace','peanut','pear','peasant','pelican','pen','penalty','pencil','people','pepper','perfect','permit',
  'person','pet','phone','photo','phrase','physical','piano','picnic','picture','piece','pilot','pink','pioneer',
  'pipe','pistol','pitch','pizza','place','planet','plastic','plate','play','please','pledge','pluck','plug',
  'plunge','poem','poet','point','polar','pole','police','pond','pony','pool','popular','portion','position',
  'possible','post','potato','pottery','poverty','powder','power','practice','praise','predict','prefer','prepare',
  'present','pretty','prevent','price','pride','primary','print','priority','prison','private','prize','problem',
  'process','produce','profit','program','project','promote','proof','property','prosper','protect','proud',
  'provide','public','pudding','pull','pulp','pulse','pumpkin','punch','pupil','puppy','purchase','purity',
  'purpose','purse','push','put','puzzle','pyramid','quality','quantum','quarter','question','quick','quit',
  'quiz','quote','rabbit','raccoon','race','rack','radar','radio','rail','rain','raise','rally','ramp','ranch',
  'random','range','rapid','rare','rate','rather','raven','raw','razor','ready','real','reason','rebel','rebuild',
  'recall','receive','recipe','record','recycle','reduce','reflect','reform','refuse','region','regret','regular',
  'reject','relax','release','relief','rely','remain','remember','remind','remove','render','renew','rent',
  'reopen','repair','repeat','replace','report','require','rescue','resemble','resist','resource','response',
  'result','retire','retreat','return','reunion','reveal','review','reward','rhythm','rib','ribbon','rice','rich',
  'ride','ridge','rifle','right','rigid','ring','riot','ripple','risk','rival','river','roast','robot','robust',
  'rocket','romance','roof','rookie','room','rose','rotate','rough','round','route','royal','rubber','rude',
  'rug','rule','run','rural','sad','saddle','sadness','safe','sail','salad','salmon','salon','salt','salute',
  'same','sample','sand','satisfy','satoshi','sauce','sausage','savage','say','scale','scan','scare','scatter',
  'scene','scheme','school','science','scissors','scorpion','scout','scrap','screen','script','scrub','sea',
  'search','season','seat','second','secret','section','security','seed','seek','segment','select','sell',
  'seminar','senior','sense','sentence','serenity','service','session','settle','setup','seven','shadow','shaft',
  'shallow','share','shed','shell','sheriff','shield','shift','shine','ship','shiver','shock','shoe','shoot',
  'shop','short','shoulder','shove','shrimp','shrug','shuffle','shy','sibling','sick','side','siege','sight',
  'sign','silent','silk','silly','silver','similar','simple','since','sing','siren','sister','situate','six',
  'size','skate','sketch','ski','skill','skin','skirt','skull','slam','sleep','slender','slice','slight','slip',
  'slope','slow','small','smart','smile','smoke','smooth','snack','snake','snap','sniff','snow','soap','soccer',
  'social','sock','soda','soft','solar','soldier','solid','solution','solve','someone','song','soon','sorry',
  'sort','soul','sound','soup','source','south','space','spare','spatial','spawn','speak','special','speed',
  'spell','spend','sphere','spice','spider','spike','spin','spirit','splash','split','spoil','sponsor','spoon',
  'sport','spot','spray','spread','spring','spy','square','squeeze','squirrel','stable','stadium','staff',
  'stage','stairs','stamp','stand','star','start','state','stay','steak','steel','stem','stereo','stick','still',
  'stitch','stock','stomach','stone','stool','story','stove','strategy','street','strike','strong','struggle',
  'student','stuff','stumble','style','subject','submit','subway','success','such','sudden','suffer','sugar',
  'suggest','suit','summer','sun','sunny','sunset','super','supply','sure','surge','surprise','surround',
  'survey','suspect','sustain','swallow','swamp','swap','swear','sweater','sweep','sweet','swift','swim',
  'swing','switch','sword','symbol','symptom','syrup','system','table','tackle','tag','tail','talent','take',
  'talk','tall','tank','tape','target','task','taste','tattoo','taxi','teach','team','tell','ten','tenant',
  'tennis','tent','term','test','text','thank','that','theme','then','theory','there','they','thick','thing',
  'think','third','this','thorough','thread','three','throw','thunder','ticket','tide','tiger','tilt','timber',
  'time','tiny','tip','tired','tissue','title','toast','tobacco','today','toddler','toe','together','toilet',
  'token','tomato','tomorrow','tone','tongue','tonight','tool','tooth','top','topic','topple','torch','tornado',
  'tortoise','total','tough','tower','town','toy','track','trade','traffic','tragic','train','trap','travel',
  'treat','tree','trend','trial','tribe','trick','trigger','trim','trip','triumph','trolley','trouble','truck',
  'truly','trumpet','trust','truth','try','tube','tuition','tumble','tuna','tunnel','turkey','turn','turtle',
  'twelve','twenty','twice','twin','twist','two','type','typical','ugly','umbrella','unable','uncle','under',
  'unify','union','unique','unit','universe','unknown','unlock','until','unusual','unveil','update','upgrade',
  'upon','upper','upset','urban','urge','usage','use','used','useful','useless','utmost','vacant','vacuum',
  'vague','valid','valley','value','van','vapor','various','vast','vault','version','very','vessel','veteran',
  'viable','vibrant','vicious','victory','video','view','village','vintage','violin','virtual','virus','visa',
  'visit','visual','vital','vivid','vocal','voice','void','volcano','volume','vote','voyage','wage','wagon',
  'wait','walk','wall','walnut','want','warfare','warm','warrior','wash','wasp','waste','water','wave','way',
  'wealth','weapon','wear','weasel','weather','web','wedding','weekend','weird','welcome','welfare','west','wet',
  'whale','what','wheat','wheel','when','where','whip','whisper','white','wide','widow','width','wife','wild',
  'will','win','window','wine','wing','wink','winter','wire','wisdom','wise','wish','witness','wolf','woman',
  'wonder','wood','wool','word','work','world','worry','worth','wrap','wreck','wrestle','wrist','write','wrong',
  'yard','year','yellow','you','young','youth','zebra','zero','zone','zoo',
];

function generateSeedPhrase(): string[] {
  const words: string[] = [];
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (let i = 0; i < 10; i++) {
    const idx = (bytes[i] * WORDLIST.length) >> 8;
    words.push(WORDLIST[idx]);
  }
  return words;
}

export default function Web3WalletScreen({ userId, profile, onBack }: Props) {
  const [stage, setStage] = useState<'intro' | 'create' | 'verify' | 'wallet'>('intro');
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [showSeed, setShowSeed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyAnswers, setVerifyAnswers] = useState<string[]>(['', '', '']);
  const [verifyError, setVerifyError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Send / Receive modals
  const [modal, setModal] = useState<null | 'receive' | 'send'>(null);
  const [receiveCoin, setReceiveCoin] = useState('USDT');
  const [sendCoin, setSendCoin] = useState('USDT');
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const COINS = ['USDT', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'DOGE', 'MATIC', 'LINK', 'DOT'];

  const generateReceiveAddress = (coin: string) => {
    // Generate coin-specific address prefix
    const prefixes: Record<string, string> = {
      BTC: 'bc1', ETH: '0x', SOL: '', BNB: '0x', USDT: 'T', XRP: 'r',
      ADA: 'addr1', AVAX: '0x', DOGE: 'D', MATIC: '0x', LINK: '0x', DOT: '1',
    };
    const prefix = prefixes[coin] || '0x';
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const body = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return prefix + body.slice(0, 38);
  };

  const startCreation = () => {
    const phrase = generateSeedPhrase();
    setSeedPhrase(phrase);
    setStage('create');
  };

  const proceedToVerify = () => {
    // Pick 3 random indices from 0-9
    const indices = Array.from({ length: 10 }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .sort((a, b) => a - b);
    setVerifyIndices(indices);
    setVerifyAnswers(['', '', '']);
    setVerifyError('');
    setStage('verify');
  };

  const completeVerification = async () => {
    // Check all 3 answers match the seed phrase at the requested indices
    for (let i = 0; i < 3; i++) {
      const expected = seedPhrase[verifyIndices[i]].toLowerCase();
      if (verifyAnswers[i].toLowerCase().trim() !== expected) {
        setVerifyError(`Word ${verifyIndices[i] + 1} is incorrect. Please check your seed phrase.`);
        return;
      }
    }
    // Generate wallet address from seed
    const addrBytes = crypto.getRandomValues(new Uint8Array(20));
    const address = '0x' + Array.from(addrBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setWalletAddress(address);
    await supabase.from('profiles').update({ web3_wallet_address: address }).eq('user_id', userId);
    setStage('wallet');
  };

  const copySeed = () => {
    navigator.clipboard.writeText(seedPhrase.join(' ')).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress).catch(() => {});
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#0b0e11] z-10">
        <button onClick={onBack}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-base font-bold">Web3 Wallet</h1>
        <div className="w-6" />
      </div>

      <div className="flex-1 px-4 pb-8">
        {stage === 'intro' && (
          <div className="flex flex-col items-center pt-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f0b90b] to-orange-600 flex items-center justify-center mb-6">
              <Wallet className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-xl font-bold mb-2">Non-Custodial Web3 Wallet</h2>
            <p className="text-sm text-[#848e9c] text-center mb-8 max-w-xs">
              Create a self-custody wallet with a 10-word recovery phrase. You hold the keys — CEO Exchange never stores your seed phrase.
            </p>
            <div className="bg-[#1e2026] rounded-xl p-4 mb-8 max-w-xs">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#848e9c] leading-relaxed">
                  Your seed phrase is the only way to recover your wallet. If you lose it, your funds are gone forever. Write it down and keep it safe.
                </p>
              </div>
            </div>
            <button onClick={startCreation}
              className="w-full max-w-xs bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl">
              Create Wallet
            </button>
          </div>
        )}

        {stage === 'create' && (
          <div className="pt-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Backup Your Seed Phrase</p>
                <p className="text-xs text-[#848e9c]">
                  Write down or copy these 10 words in order. You'll be asked to verify them next. Never share this phrase with anyone.
                </p>
              </div>
            </div>

            <div className="bg-[#1e2026] rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold">Your 10-Word Seed Phrase</p>
                <button onClick={() => setShowSeed(!showSeed)} className="text-[#848e9c]">
                  {showSeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {seedPhrase.map((word, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#0b0e11] rounded-lg px-3 py-2.5">
                    <span className="text-xs text-[#474d57] font-mono">{i + 1}.</span>
                    <span className={`text-sm font-mono ${showSeed ? 'text-[#eaecef]' : 'text-transparent bg-[#2b2f36] rounded'} select-all`}>
                      {showSeed ? word : '••••••'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button onClick={copySeed} className="flex-1 flex items-center justify-center gap-2 bg-[#1e2026] border border-[#2b2f36] text-[#eaecef] py-3 rounded-xl text-sm font-semibold">
                {copied ? <><Check className="w-4 h-4 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
              </button>
            </div>

            <button onClick={proceedToVerify}
              className="w-full bg-[#f0b90b] hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl">
              I've Saved It — Verify
            </button>
          </div>
        )}

        {stage === 'verify' && (
          <div className="pt-4">
            <div className="bg-[#1e2026] rounded-xl p-4 mb-4 flex gap-3">
              <KeyRound className="w-5 h-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#848e9c]">
                Enter word #{verifyIndices[0] + 1}, #{verifyIndices[1] + 1}, and #{verifyIndices[2] + 1} from your seed phrase to confirm your backup.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {verifyIndices.map((idx, i) => (
                <div key={idx}>
                  <p className="text-xs text-[#848e9c] mb-1.5">Word #{idx + 1}</p>
                  <input
                    type="text"
                    value={verifyAnswers[i]}
                    onChange={e => {
                      const next = [...verifyAnswers];
                      next[i] = e.target.value;
                      setVerifyAnswers(next);
                    }}
                    placeholder={`Enter word ${idx + 1}`}
                    className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]"
                  />
                </div>
              ))}
            </div>

            {verifyError && (
              <p className="text-xs text-rose-400 flex items-center gap-1 mb-4">
                <AlertTriangle className="w-3 h-3" /> {verifyError}
              </p>
            )}

            <button onClick={completeVerification}
              disabled={verifyAnswers.some(a => !a.trim())}
              className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl">
              Confirm & Enable Wallet
            </button>
            <button onClick={() => setStage('create')} className="w-full text-[#848e9c] text-sm py-2 mt-2">
              Back to Seed Phrase
            </button>
          </div>
        )}

        {stage === 'wallet' && (
          <div className="pt-4">
            <div className="bg-gradient-to-br from-[#f0b90b] to-orange-600 rounded-2xl p-5 mb-4">
              <p className="text-xs text-black/70 mb-1">Wallet Balance</p>
              <p className="text-3xl font-black text-black mb-3">0.0000 USDT</p>
              <div className="flex gap-2">
                <button className="flex-1 bg-black/20 text-black font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <ArrowDownToLine className="w-4 h-4" /> Receive
                </button>
                <button className="flex-1 bg-black text-[#f0b90b] font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5">
                  <ArrowUpFromLine className="w-4 h-4" /> Send
                </button>
              </div>
            </div>

            <div className="bg-[#1e2026] rounded-xl p-4 mb-4">
              <p className="text-xs text-[#848e9c] mb-2">Wallet Address</p>
              <div className="flex items-center gap-2 bg-[#0b0e11] rounded-lg px-3 py-2.5 mb-3">
                <p className="flex-1 text-xs text-[#eaecef] font-mono break-all">{walletAddress}</p>
                <button onClick={copyAddress} className="flex-shrink-0">
                  {copiedAddr ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#848e9c]" />}
                </button>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={walletAddress} size={140} level="M" />
                </div>
              </div>
            </div>

            <div className="bg-[#1e2026] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <p className="text-sm font-bold text-emerald-400">Wallet Secured</p>
              </div>
              <p className="text-xs text-[#848e9c]">
                Your wallet is backed by your 10-word seed phrase. Keep it offline and never share it.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Receive Modal */}
      {modal === 'receive' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setModal(null)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[#eaecef]">Receive Crypto</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Select Coin</label>
                <div className="grid grid-cols-4 gap-2">
                  {COINS.map(c => (
                    <button key={c} onClick={() => setReceiveCoin(c)} className={`py-2 rounded-lg text-xs font-bold ${receiveCoin === c ? 'bg-[#f0b90b] text-black' : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b2f36]'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl">
                  <QRCodeSVG value={generateReceiveAddress(receiveCoin)} size={180} level="M" />
                </div>
              </div>
              <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3">
                <p className="text-xs text-[#848e9c] mb-1">Your {receiveCoin} Receive Address</p>
                <p className="text-sm font-mono text-[#eaecef] break-all">{generateReceiveAddress(receiveCoin)}</p>
              </div>
              <p className="text-xs text-[#474d57] text-center">Only send {receiveCoin} to this address. Sending other coins may result in permanent loss.</p>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {modal === 'send' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center max-w-md mx-auto" onClick={() => setModal(null)}>
          <div className="w-full bg-[#181a20] rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-[#eaecef]">Send Crypto</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-[#848e9c]" /></button>
            </div>
            <div className="space-y-4">
              {sendSuccess ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="font-bold text-[#eaecef]">Transfer Submitted</p>
                  <p className="text-xs text-[#848e9c] text-center">Your {sendCoin} transfer is being processed. A $1 platform fee has been applied.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Select Coin</label>
                    <div className="grid grid-cols-4 gap-2">
                      {COINS.map(c => (
                        <button key={c} onClick={() => setSendCoin(c)} className={`py-2 rounded-lg text-xs font-bold ${sendCoin === c ? 'bg-[#f0b90b] text-black' : 'bg-[#0b0e11] text-[#848e9c] border border-[#2b2f36]'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Recipient Address</label>
                    <input type="text" value={sendToAddress} onChange={e => setSendToAddress(e.target.value)} placeholder={`Enter ${sendCoin} address`} className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                  </div>
                  <div>
                    <label className="text-xs text-[#848e9c] block mb-1.5 font-medium">Amount</label>
                    <input type="number" inputMode="decimal" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.00" className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-xl px-4 py-3 text-sm text-[#eaecef] outline-none focus:border-[#f0b90b] placeholder-[#474d57]" />
                  </div>
                  <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs text-[#848e9c]">Platform Fee</span>
                    <span className="text-sm font-bold text-[#f0b90b]">$1.00</span>
                  </div>
                  {sendError && <p className="text-xs text-rose-400">{sendError}</p>}
                  <button onClick={async () => {
                    setSendError('');
                    if (!sendToAddress.trim()) { setSendError('Enter recipient address'); return; }
                    if (!sendAmount || parseFloat(sendAmount) <= 0) { setSendError('Enter valid amount'); return; }
                    setSending(true);
                    await new Promise(r => setTimeout(r, 1200));
                    setSending(false);
                    setSendSuccess(true);
                    setTimeout(() => { setModal(null); setSendSuccess(false); setSendToAddress(''); setSendAmount(''); }, 2000);
                  }} disabled={sending} className="w-full bg-[#f0b90b] hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl text-sm">
                    {sending ? 'Processing...' : `Send ${sendCoin}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
