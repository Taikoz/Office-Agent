// The conversation base of the break room (social/dialogue.js). A thread is one line:
//   "opener | agreeing answers | joking answers | disagreeing answers | follow-up => last word"
// each part a list split by ";" (a follow-up without "=>" gets a neutral last word); an empty part falls back to the
// general answers for a question or a statement. Placeholders: {b} the listener, {x} another teammate, {chief},
// {cat}, {dog}, {crush}, {dish}, {cook}, {best}.

export const TOPICS = [
  /* ---------- the code ---------- */
  { id: "code", w: 3, threads: [
    "J'ai refactoré 300 lignes ce matin. | Respect. Montre-moi ça ;Propre ! T'as gardé les tests verts ? | Et ça compile ? ;300 de moins ou de plus ? | Tu vas tout casser avant vendredi. ;Refactor un mardi, courageux. | Je fais une démo après la pause => Je viendrai voir. ;J'ai juste renommé des trucs, en vrai => Ha ha, ça compte quand même.",
    "Tu préfères tabs ou espaces ? | Espaces, comme tout le monde. ;Tabs, et j'assume. | Les deux, pour énerver tout le monde. ;Je laisse le formateur choisir. | Sérieux, encore ce débat ? ;Je m'en fiche, j'ai un linter. | Bon, le linter tranchera => Comme toujours.",
    "J'ai trouvé un bug qui date de 2019. | Bravo, chasseur de bugs ! ;Il était bien caché, celui-là. | Il a l'âge d'aller à l'école. ;Faut lui fêter son anniversaire. | Ne touche à rien, ça marchait. ;Il fait partie de l'architecture maintenant. | Je le corrige cet après-midi => Fais une belle MR. ;Personne l'avait vu en quatre ans => Ou personne voulait le voir.",
    "Qui a écrit cette regex ? Elle me fait peur. | Pas moi, je le jure. ;Elle fait peur à tout le monde. | C'est {x}, il parle couramment le regex. ;Elle s'est écrite toute seule. | Elle marche, n'y touche pas. ;Moi je la trouve belle. | Je vais mettre un commentaire au-dessus => Une prière, plutôt.",
    "J'ai supprimé du code mort, quel bonheur. | Le meilleur code, c'est celui qu'on supprime. ;Ça fait tellement de bien. | T'as supprimé ma feature, non ? ;RIP le code. | T'es sûr qu'il était mort ? ;Attends qu'un client s'en serve. | Moins 800 lignes => Respect total.",
    "Mon IDE a planté trois fois ce matin. | Le mien aussi, la mise à jour est pourrie. ;Redémarre tout, ça marche toujours. | Il te fait passer un message. ;Il a vu ton code. | Le mien marche nickel. ;Change d'IDE, sérieux. | Je vais coder sur papier => Ha ha, et compiler à la main ?",
    "J'ai enfin compris les monades. Je crois. | Explique-moi, alors ! ;Bravo, c'est un cap. | C'est un burrito, non ? ;Et maintenant tu peux plus l'expliquer. | Personne ne comprend vraiment les monades. ;Je doute, montre-moi. | Je te fais un schéma au tableau => Avec plaisir. ;Bon, peut-être pas tout => Ha ha, comme tout le monde.",
    "Rust, ça te tenterait ? | Grave, j'adore le compilateur. ;Pour un petit projet, oui. | Le borrow checker me déteste. ;Seulement si on le réécrit tout en Rust. | Pas le temps d'apprendre un langage. ;Trop de rouge dans mon terminal. | On se fait un atelier vendredi ? => Ça marche, je ramène les croissants.",
    "J'ai mis un TODO en 2022, il est toujours là. | Il fait partie de l'équipe maintenant. ;On a tous un TODO comme ça. | Il a droit à des congés ? ;Fais-lui un gâteau. | Supprime-le, il fera rien. ;Fais un ticket au lieu d'un TODO. | Un jour je le ferai => Ou pas. ;Je l'ai renommé en FIXME => Belle promotion.",
    "Le nommage, c'est vraiment le plus dur. | Avec l'invalidation de cache. ;Je passe plus de temps à nommer qu'à coder. | J'appelle tout « truc ». ;data2Final_v3, ça te va ? | Moi ça va, je nomme vite. ;Faut juste être cohérent. | J'ai appelé une variable « machin » => On va en reparler en review.",
    "Je viens de découvrir un raccourci clavier génial. | Montre ! ;Lequel ? Je veux savoir. | Ctrl+Z, c'est ça ? ;Celui pour fermer l'IDE ? | Je connais déjà tous les raccourcis. ;Moi j'utilise la souris, et alors ? | Ça me fait gagner dix minutes par jour => Je vais l'apprendre aussi.",
    "J'ai écrit une fonction de 12 lignes. Elle est belle. | Ça fait du bien, le code propre. ;Encadre-la. | Elle fait quoi ? ;12 lignes de commentaires ? | Et la fonction d'à côté, elle en fait 400. ;Montre avant de te vanter. | Je l'ai montrée à {cat}, elle a ronronné => Approuvée par le jury.",
    "J'ai passé deux heures sur un point-virgule. | Le classique. ;Ça nous arrive à tous. | Il était bien caché, ce coquin. ;Il fallait un point-virgule ou pas ? | Un linter t'aurait sauvé. ;Deux heures, quand même… | Je me sens bête => T'es pas bête, t'es dev.",
  ] },
  { id: "tests", w: 2, when: c => c.weather !== "clear", threads: c => ({
    sun: ["Tous les tests sont verts ! | Enfin ! ;Ça fait plaisir à voir. | Profitons-en pour ne rien toucher. ;Je fais une capture d'écran. | Ça va pas durer. ;Attends la prochaine MR… | On merge vite avant que ça casse => Ha ha, sage décision.",
      "La CI brille comme un soleil aujourd'hui. | Le pipeline est de bonne humeur. ;Bonne journée en vue. | Il a bu son café, lui aussi. ;Faut lui faire un câlin. | J'ai encore un test qui clignote. ;Le soleil, c'est avant l'orage. | On devrait fêter ça => Croissants ?"],
    cloud: ["Encore un test flaky… | Faudrait le fiabiliser. ;Celui de la base de données ? | Il a le droit d'être de mauvaise humeur. ;Relance, ça passera. | Moi je l'ai jamais vu échouer. ;C'est peut-être un vrai bug. | Je le mets en quarantaine => Bonne idée.",
      "Deux ou trois tests rouges, rien de grave. | On s'en occupe cet après-midi. ;Tant que c'est pas la prod. | Rouge, c'est presque orange. ;Ils veulent de l'attention. | Rien de grave, c'est vite dit. ;Trois tests rouges, c'est trois bugs. | Je regarde les logs => Tiens-moi au courant."],
    rain: ["Qui a cassé les tests ? | Pas moi, juré. ;Je regarde le dernier merge. | Le coupable a fui en salle de repos. ;C'est {x}, je le sens. | Personne, c'est la CI qui fait des siennes. ;On cherche pas de coupable. | Je lance un bisect => Bon courage.",
      "La CI est rouge vif. | Faut qu'on s'en occupe. ;Je préviens {chief}. | Rouge, c'est ma couleur préférée. ;Elle s'est mise à la mode. | Ça ira mieux demain. ;C'est que des tests flaky. | On s'y met à deux ? => Ok, après le café."],
    storm: ["C'est l'orage sur la pipeline. | On gèle les merges. ;Je préviens tout le monde. | Sortez les parapluies. ;Je vais me cacher sous le bureau. | Ça va, j'ai vu pire. ;Pas de panique. | Je vais voir {chief} => Bonne chance.",
      "Plus de rouge que de vert, au secours. | Faut qu'on fasse une cellule de crise. ;J'arrête tout et je regarde. | On peint tout en vert ? ;Le vert est en grève. | Calme-toi, on va trouver. ;C'est sûrement la même cause. | Café et on attaque => Double café."],
  })[c.weather] || [] },
  { id: "review", w: 2, threads: [
    "{x} m'a laissé 34 commentaires en review. | Il est minutieux, au moins. ;Ça va t'apprendre plein de trucs. | 34 ? Il t'aime bien. ;Il a commenté les espaces aussi ? | C'est trop, faut lui dire. ;Il exagère un peu, là. | Je réponds à tout demain => Courage.",
    "T'as regardé ma MR ? | Je la regarde après la pause. ;Oui, j'ai mis deux petits commentaires. | Je l'ai lue en diagonale. ;J'ai mis un 👍, ça compte ? | Pas encore, désolé. ;Elle fait 2000 lignes, laisse-moi souffler. | Elle est petite, promis => Ok, je la fais tout de suite.",
    "{b}, ta dernière MR était super propre. | Merci, ça fait plaisir ! ;J'ai pris le temps, cette fois. | Je l'ai fait relire par {cat}. ;C'était un copier-coller, chut. | Elle avait quand même un bug… ;Propre mais trop longue. | Tu peux l'utiliser comme exemple => Ha ha, je suis flatté.",
    "Les reviews le vendredi soir, c'est non. | Mille fois d'accord. ;On devrait l'écrire dans les règles. | Sauf si t'offres l'apéro. ;Le vendredi on approuve tout, non ? | Bah, si c'est urgent. ;Ça dépend de la MR. | Je le dis au stand-up => Bonne idée.",
    "Il faudrait des MR plus petites. | Carrément, c'est plus facile à relire. ;Je découpe les miennes maintenant. | Une ligne par MR, alors. ;Une MR par caractère. | Parfois c'est pas possible. ;Les grosses MR ont leur charme. | On fixe une limite à 400 lignes ? => Ça me va.",
  ] },
  { id: "ai", w: 2, threads: [
    "Les agents bossent plus vite que nous, non ? | Ils sont devenus bons, c'est fou. ;C'est un super binôme. | Mais ils boivent pas de café. ;Ils font pas de pause, eux. | Faut toujours vérifier derrière. ;Plus vite, pas forcément mieux. | Je relis toujours leurs MR => C'est sage.",
    "Un agent m'a écrit mes tests ce matin. | Pratique ! Ils étaient bons ? ;Moi aussi, ça fait gagner du temps. | Il veut un bureau maintenant. ;Il a mis son nom dans le commit ? | Relis-les quand même. ;Moi je préfère écrire les miens. | Il a trouvé un cas que j'avais oublié => Impressionnant.",
    "Tu crois qu'un jour l'agent fera les stand-ups ? | Ça raccourcirait la réunion. ;Peut-être, mais pas les blagues. | Il dira « hier j'ai codé, aujourd'hui je code ». ;Et il apportera les croissants ? | Ah non, ça c'est humain. ;J'espère pas. | J'en parle à {chief} => Ha ha, il va adorer.",
    "L'agent a trouvé le bug avant moi. | Il a un bon œil. ;C'est un gain de temps énorme. | Il te prend ton job, attention. ;Il a de meilleurs yeux que toi. | Il a eu de la chance. ;Faut vérifier qu'il l'a vraiment réglé. | Je lui ai dit merci dans le commit => T'as bien fait.",
  ] },
  /* ---------- the day ---------- */
  { id: "morning", w: 3, when: c => c.h < 10, threads: [
    "Bien dormi ? | Comme un bébé. ;Plutôt bien, et toi ? | J'ai rêvé de code, c'est grave ? ;Je dors encore, là. | Trois heures de sommeil… ;Pas du tout, mon voisin fait des travaux. | Un café et ça ira mieux => Je t'en fais un.",
    "J'ai raté mon bus ce matin. | Oh non, t'es venu comment ? ;Ça arrive. | T'as couru comme dans un film ? ;Le bus t'a vu et il est parti. | Le mien était en retard, lui. ;Fallait partir plus tôt. | J'ai marché vingt minutes => Bon, c'est du sport.",
    "Pas réveillé avant mon deuxième café. | Pareil, c'est la règle. ;Je te fais le deuxième. | Moi j'en suis au quatrième. ;T'es un zombie, en fait. | Moi je bois pas de café. ;Essaie le thé. | Ne me parle pas avant 9 h 30 => Promis.",
    "C'est quoi le programme aujourd'hui ? | Tickets, tickets, tickets. ;Stand-up puis grosse session. | Café, sieste, café. ;Survivre jusqu'à midi. | Je sais pas encore. ;Demande à {chief}. | On regarde le tableau ensemble ? => Allez.",
    "J'ai fait du vélo pour venir ! | Bravo, quelle motivation. ;Il faisait beau en plus. | T'as transpiré sur ton clavier ? ;Le Tour de France, c'est quand ? | Moi c'est métro, et c'est très bien. ;Avec cette pluie ? Courageux. | Demain tu viens avec moi ? => On verra…",
  ] },
  { id: "lunch", w: 3, when: c => c.h >= 11 && c.h < 14, threads: [
    "On mange quoi ce midi ? | Pizza ! ;Je testerais bien le nouveau thaï. | Ce qu'il reste dans le frigo. ;Des chips, comme des champions. | J'ai ramené mon repas. ;Pas faim, trop de café. | On part à 12 h 15 ? => Je préviens {x}.",
    "Pizza ou sushi ? | Pizza, sans hésiter. ;Sushi, je suis au régime. | Pizza aux sushis. ;Les deux, on n'est pas des sauvages. | Aucun des deux, salade. ;J'ai déjà mangé. | Je commande => Prends-moi une quatre fromages.",
    "J'ai oublié mon tupperware. | Je partage le mien. ;Viens avec nous au resto. | Le frigo a eu faim. ;Il est resté dans le bus ? | Tant pis, jeûne. ;Le micro-ondes est triste. | Je vais à la boulangerie => Prends-moi un croissant.",
    "On se fait un pique-nique sur la terrasse ? | Bonne idée, il fait beau. ;Je prends les boissons. | Si {cat} vole rien. ;Avec la nappe à carreaux ! | Il fait trop froid. ;Les pigeons, non merci. | Rendez-vous à midi pile => Ça marche.",
    "J'ai une faim de loup. | Moi aussi, on y va ? ;J'ai des biscuits si tu veux. | Le loup, c'est toi. ;Mange ton clavier. | Il est que 11 h… ;Moi j'ai pas faim. | J'attends personne => Ha ha, je te suis.",
  ] },
  { id: "afternoon", w: 1, when: c => c.h >= 14 && c.h < 17, threads: [
    "Le coup de barre de 15 h… | Pareil, je pique du nez. ;Ça m'arrive tous les jours. | Sieste sous le bureau ? ;Je dors les yeux ouverts, là. | Moi je suis en pleine forme. ;C'est mon meilleur moment. | Un café et ça repart => Je t'accompagne.",
    "C'est l'heure du goûter, non ? | Oui ! J'ai des madeleines. ;Toujours l'heure du goûter. | Chocolat ou rien. ;On a quel âge, déjà ? | Je viens de manger. ;Pas de sucre pour moi. | Je ramène des cookies => T'es le meilleur.",
  ] },
  { id: "evening", w: 2, when: c => c.h >= 18, threads: [
    "On reste tard ce soir ? | Encore un peu, je finis mon ticket. ;Non, je décroche bientôt. | Je dors ici, j'ai mon pouf. ;Jusqu'à ce que la CI soit verte. | Pas question, j'ai une vie. ;Moi je pars à 18 h 30. | Dernière MR et j'y vais => Bonne soirée alors.",
    "Il fait déjà nuit dehors. | L'hiver arrive. ;C'est l'heure de rentrer. | La nuit, tous les bugs sont gris. ;Parfait pour coder en mode sombre. | Ça me dérange pas. ;Moi j'aime bien la nuit. | Qui ferme les lumières ? => Le dernier sorti.",
    "Je file bientôt, moi. | Bonne soirée ! ;Moi aussi, à demain. | Déjà ? T'es arrivé à quelle heure ? ;Le dernier offre les croissants. | Reste encore un peu. ;T'as fini ton ticket ? | À demain ! => Repose-toi bien.",
  ] },
  { id: "monday", w: 3, when: c => c.dow === 1, threads: [
    "Dur, le lundi… | Pareil, je suis pas réveillé. ;Courage, plus que quatre jours. | Lundi, c'est le vendredi du pauvre. ;Le lundi devrait être férié. | J'aime bien les lundis, moi. ;Ça va, j'ai bien rechargé. | Allez, on y va doucement => Doucement mais sûrement.",
    "T'as fait quoi ce week-end ? | Une rando, c'était génial. ;Rien du tout, et c'était parfait. | J'ai codé, évidemment. ;J'ai dormi 20 heures. | Je préfère pas en parler. ;Trop de choses à raconter. | Moi j'ai vu un super film => Lequel ?",
    "J'ai oublié mon mot de passe pendant le week-end. | Classique du lundi. ;Moi aussi, je l'ai changé trois fois. | Il a pris des vacances, lui aussi. ;C'était « motdepasse123 » ? | Note-le quelque part. ;Utilise un gestionnaire. | J'appelle le support => Bon courage.",
  ] },
  { id: "friday", w: 3, when: c => c.dow === 5, threads: [
    "Qui vient à l'afterwork ce soir ? | Moi ! ;J'en suis, j'ai besoin de décompresser. | J'apporte les chips. ;Je serai là pour le karaoké. | Pas ce soir, je suis crevé. ;J'ai un dîner, désolé. | On se retrouve sur la terrasse ? => Ça marche.",
    "On merge pas le vendredi, hein. | Jamais de la vie. ;C'est la règle d'or. | Je merge et je pars en courant. ;Sauf si c'est un tout petit fix… | Si c'est testé, pourquoi pas. ;Moi je merge quand je veux. | On déploie lundi, promis => Ha ha, promis.",
    "Des plans ce week-end ? | Je pars à la mer. ;Concert samedi soir ! | Dormir, coder, dormir. ;Rattraper ma série en retard. | Rien, je reste chez moi. ;Je travaille, malheureusement. | Moi je vais voir ma famille => Profite bien.",
  ] },
  /* ---------- how one feels ---------- */
  { id: "tired", w: 4, when: c => c.ma.fatigue >= 70, threads: [
    "Je suis lessivé… | Va te poser sur le canapé. ;Moi aussi, quelle journée. | Tu ressembles à un ticket bloqué. ;Le canapé t'appelle. | Courage, c'est bientôt fini. ;Un café et ça repart ! | Je vais m'allonger cinq minutes => Je te réveille dans dix.",
    "J'ai les yeux qui piquent. | Fais une pause écran. ;Moi pareil, trop de lumière bleue. | Tu pleures sur ton code ? ;C'est le mode sombre qui manque. | Bois de l'eau. ;Ça va passer. | Je ferme les yeux deux minutes => Je surveille.",
    "Je pourrais dormir sur le baby-foot. | Fais attention aux demis. ;Le pouf est plus confortable. | Je mets une pièce, attention. ;Le gardien va te réveiller. | Tiens bon, c'est presque fini. ;Va plutôt rentrer. | Je rentre tôt ce soir => Bonne idée.",
  ] },
  { id: "bored", w: 4, when: c => c.ma.ennui >= 65, threads: [
    "On s'ennuie, appelez-nous ! | Grave, il se passe rien. ;{chief} va bien nous trouver un truc. | On fait un tournoi de baby ? ;Compte les dalles du plafond. | Moi je profite du calme. ;Le calme avant la tempête. | Je vais demander un ticket à {chief} => Bonne chance.",
    "J'ai compté les dalles du plafond. | Combien ? ;Moi j'ai compté les fleurs du tapis. | Tu t'es trompé, j'en compte une de plus. ;T'as besoin de vacances. | Moi j'ai plein de boulot. ;Fais quelque chose d'utile ! | Il y en a 84 => Passionnant.",
  ] },
  { id: "hungry", w: 4, when: c => c.ma.faim <= 30, threads: [
    "J'ai une faim de loup. | Moi aussi, on se fait un truc ? ;Il reste des pâtes. | Le loup, c'est toi. ;Mange un post-it. | Moi j'ai trop mangé ce midi. ;Tiens bon jusqu'au goûter. | Je vais voir à la cuisine => Ramène-moi un truc.",
    "Qui a pris mon yaourt ? | Pas moi, juré. ;Je l'ai vu ce matin pourtant. | C'est {cat}, c'est sûr. ;Le yaourt est parti en prod. | Il était périmé de toute façon. ;T'avais mis ton nom dessus ? | La prochaine fois je l'étiquette => Avec un cadenas.",
    "Il reste quelque chose au frigo ? | Il reste du fromage. ;Des pâtes d'hier, je crois. | Une moutarde et une tomate triste. ;Un écho, quand tu l'ouvres. | Rien, faut faire les courses. ;Tout est périmé. | On fait des courses ? => Je demande à {chief}.",
  ] },
  { id: "coffee", w: 3, when: c => c.ma.cafe <= 40 || c.act === "kitchen" || c.traits.includes("cafeinomane"), threads: [
    "Il me faut un café, vite. | Je t'en fais un. ;Allez, je t'accompagne. | Ton sang, c'est du café maintenant. ;Perfusion de café, alors. | Tu en as déjà bu quatre. ;Passe au déca, peut-être. | Sucre ou pas ? => Sans, merci.",
    "Qui a fini le café sans en refaire ? | Pas moi ! ;C'est un crime. | C'est {x}, le criminel du café. ;L'enquête est ouverte. | J'ai pas eu le temps, désolé. ;Je l'ai fini mais j'ai lavé la tasse. | Je mets un panneau => « Refais du café ».",
    "Ce café est vraiment bon. | Nouveau grain, il paraît. ;Meilleur que celui du bureau. | Il est bon parce que c'est le dixième. ;C'est la tasse qui fait tout. | Moi je le trouve amer. ;Trop fort pour moi. | J'en reprends un => Moi aussi.",
    "Mon troisième café de la journée. | Seulement ? ;Raisonnable. | Petit joueur, j'en suis à six. ;Le compteur tourne. | Ralentis un peu. ;Tu vas pas dormir ce soir. | Le dernier, promis => Ha ha, on te croit.",
  ] },
  { id: "lonely", w: 3, when: c => c.ma.social <= 30, threads: [
    "Ça fait plaisir de parler à quelqu'un. | Moi aussi, ça me fait du bien. ;Viens, assieds-toi. | Je te facture la séance. ;Tu parlais à {cat} avant ? | Je suis un peu pressé, là. ;Plus tard, promis. | On devrait faire ça plus souvent => Carrément.",
    "Tu me racontes ta journée ? | Avec plaisir, assieds-toi. ;Elle a été longue, mais bien. | Café, code, café. ;Tu veux la version courte ou longue ? | Pas grand-chose à raconter. ;Plus tard, si tu veux. | Moi j'ai eu un bug bizarre => Raconte !",
  ] },
  { id: "happy", w: 2, when: c => c.ma.moral >= 75, threads: [
    "Quelle équipe, franchement ! | Grave, on est les meilleurs. ;Ça fait chaud au cœur. | T'as bu combien de cafés ? ;Un mug à ton nom, alors. | Attends la prochaine prod… ;On n'est pas parfaits non plus. | On se fait une photo d'équipe ? => Allez !",
    "J'adore bosser ici. | Moi aussi, l'ambiance est top. ;Surtout depuis la nouvelle salle de repos. | T'es payé pour dire ça ? ;Tu veux une promotion ? | Les lundis, moins. ;Sauf quand la CI est rouge. | Faut le dire à {chief} => Il va être content.",
  ] },
  { id: "glum", w: 3, when: c => c.ma.moral <= 30, threads: [
    "Rien ne va aujourd'hui. | Viens, on fait une pause. ;Raconte-moi ce qui se passe. | Une partie de baby, ça règle tout. ;Je t'offre un croissant ? | Faut relativiser. ;Demain ça ira mieux. | Merci, ça m'aide => Je suis là.",
    "Mon ticket me déprime. | On le regarde ensemble ? ;C'est lequel ? | Donne-le à {x}. ;Brûle-le. | Ça fait partie du métier. ;T'as demandé de l'aide ? | Je vais en parler à {chief} => Bonne idée.",
  ] },
  /* ---------- the traits ---------- */
  { id: "trait", w: 2, when: c => c.traits.length > 0, threads: c => ({
    gourmand: ["Je rêve d'une raclette. | Grave, on en fait une ce soir ? ;Avec du bon fromage. | Il est 10 h… ;Toi, tu penses qu'à manger. | Trop lourd pour moi. ;En été ? Non. | J'apporte l'appareil vendredi => Je ramène les patates.",
      "J'ai repéré une boulangerie incroyable. | Elle est où ? ;Les croissants sont bons ? | Tu nous en ramènes demain ? ;Toi et les boulangeries… | Je fais attention en ce moment. ;Elles sont toutes pareilles. | J'y vais demain matin => Prends-moi un pain au chocolat."],
    fetard: ["Ce soir, karaoké ! | J'en suis ! ;Je prépare ma chanson. | Pas de chanson triste, cette fois. ;Je chante en duo avec {chief}. | Je chante faux, je regarde. ;Pas ce soir, je suis crevé. | Je réserve la scène => Ha ha, elle est à nous.",
      "On organise une soirée pour la prochaine release ? | Avec plaisir ! ;Je m'occupe de la musique. | Et si la release casse ? ;Une soirée par commit. | On verra si elle passe d'abord. ;Une petite, alors. | Je fais la liste => Mets-moi dessus."],
    solitaire: ["J'aime bien quand c'est calme ici. | Moi aussi, c'est reposant. ;C'est rare, profites-en. | Je vais faire du bruit, du coup. ;Tu veux que je parte ? | Moi je préfère quand c'est animé. ;C'est un peu mort, là. | Je mets mon casque => Je te laisse tranquille.",
      "Je vais lire un peu dans mon coin. | Bonne lecture. ;Le fauteuil est libre. | Tu lis quoi, un manuel ? ;Je te dérange pas, promis. | Viens plutôt jouer. ;Tu lis trop. | C'est un roman de science-fiction => Tu me le prêteras ?"],
    perfectionniste: ["J'ai 100 % de couverture de tests. | Impressionnant. ;Respect, sérieusement. | Même les getters ? ;Tu testes tes tests ? | Ça veut pas dire zéro bug. ;C'est un peu excessif. | J'ai même testé les messages d'erreur => T'es un modèle.",
      "Il manque un point à la fin de ton commentaire. | Ah, merci ! ;Bien vu. | Tu relis aussi les commentaires ? ;C'est ton œil de lynx. | C'est un détail. ;Laisse-le, c'est rien. | J'ai fait une MR pour ça => Ha ha, sérieux ?"],
    cafeinomane: ["Cinquième café. Ou sixième. | Tu comptes encore ? ;C'est un record ? | Ton sang a un goût d'espresso. ;Tu vibres un peu, là. | Ralentis, ton cœur va lâcher. ;Passe au thé. | Je vais en refaire un => Pour moi aussi.",
      "J'ai testé une nouvelle torréfaction. | Alors, verdict ? ;Fais-moi goûter. | Tu fais ton sommelier du café. ;Notes de noisette et de bug ? | Pour moi c'est tout le même. ;Je vois pas la différence. | Je ramène un paquet demain => Trop bien."],
    bavard: ["Attends, faut que je te raconte un truc. | Vas-y, raconte ! ;Je t'écoute. | C'est long ? ;Encore une histoire de voisin ? | J'ai pas trop le temps, là. ;Après, promis. | Hier j'ai croisé un ancien collègue => Ah oui ? Et alors ?",
      "Tu sais pas ce qui m'est arrivé hier ? | Non, raconte ! ;Quoi ? | T'as gagné au loto ? ;T'as encore perdu tes clés ? | Je vais bientôt le savoir, je sens. ;Fais court. | Mon chat a appuyé sur Entrée en pleine visio => Ha ha, génial !"],
    zen: ["Respire, tout va bien se passer. | Merci, j'en avais besoin. ;T'as raison. | Facile à dire avec la CI rouge. ;T'as pris des cours ? | Tu dis ça à chaque fois. ;Pas aujourd'hui, non. | J'ai médité dix minutes => Faudra m'apprendre.",
      "Un bug, c'est juste une leçon. | Sage parole. ;J'aime cette philosophie. | Alors j'ai beaucoup appris cette semaine. ;Je vais l'écrire sur un post-it. | Un bug en prod, c'est surtout un problème. ;Dis ça au client. | Je l'ai lu dans un livre => Prête-le-moi."],
    sportif: ["Footing ce midi, qui vient ? | Moi ! ;Je viens, mais doucement. | Seulement si on s'arrête à la boulangerie. ;Je te regarde de la fenêtre. | Pas aujourd'hui, j'ai mal partout. ;Il pleut, non ? | Départ 12 h 10 => Je serai là.",
      "J'ai battu mon record au ping-pong. | Bravo ! Contre qui ? ;Revanche quand tu veux. | Contre {cat} ? ;T'as joué contre le mur ? | Moi je te bats les yeux fermés. ;Contre un débutant, ça compte pas. | On fait un match ? => Prépare-toi à perdre."],
    levetot: ["J'étais là à 7 h, c'est le meilleur moment. | Le calme du matin, j'adore. ;Respect. | 7 h ? Ça existe ? ;Moi à 7 h je dors encore. | Trop tôt pour moi. ;Tu dors à quelle heure ? | Le matin le code coule tout seul => Je vais essayer demain.",
      "Je me couche à 22 h, c'est mon secret. | Ça se voit, t'es en forme. ;Je devrais faire pareil. | 22 h, c'est l'heure de mon premier épisode. ;T'as 80 ans ? | Impossible pour moi. ;Et tes soirées ? | Le sommeil, c'est sacré => T'as raison."],
    ambitieux: ["Je vise employé de la semaine. | Tu le mérites. ;Je vote pour toi. | Moi je vise sieste de la semaine. ;Faut corrompre {chief}. | Il faudra me battre d'abord. ;Tu l'as déjà eu le mois dernier. | Je prends le ticket le plus dur => Bonne chance.",
      "Dans un an, je serai lead. | J'en doute pas. ;Tu en as le niveau. | Et moi ton assistant ? ;Tu me garderas dans ton équipe ? | Faut pas aller trop vite. ;C'est pas que du code, d'être lead. | J'y travaille => Ça se voit."],
  })[c.trait] || [] },
  /* ---------- the office ---------- */
  { id: "news", w: 4, when: c => c.news.length > 0, threads: c => c.news.map(n => /livré/.test(n) ? `${n} | Bien joué ! ;Il gère. | Il paie les croissants alors. ;Il a eu de l'aide de l'agent. | Enfin, il était temps. ;On verra en prod. | Je vais le féliciter => Moi aussi.`
      : /bloqué/.test(n) ? `${n} | Faudrait l'aider. ;Je vais voir avec lui. | Il est bloqué ou il fait la sieste ? ;Il cherche dans les logs depuis une heure. | Il va s'en sortir. ;C'est un ticket piégé. | J'y vais après le café => Il va apprécier.`
      : `${n} | Il avance bien. ;Bon courage à lui. | Il est concentré, chut. ;Il code ou il joue ? | C'est un gros morceau. ;Ça va prendre du temps. | On lui apporte un café ? => Bonne idée.`) },
  { id: "chief", w: 2, threads: [
    "{chief} est vraiment sympa. | Un bon chef, c'est rare. ;Il nous chouchoute. | Il nous regarde en ce moment, chut. ;Tu veux une augmentation ? | Il pourrait nous donner moins de tickets. ;Ça dépend des jours. | Faut qu'on le remercie => On lui fait un gâteau ?",
    "{chief} a encore joué à la console. | Il a le droit de souffler aussi. ;Il est fort, en plus. | Il a battu mon record, ça m'énerve. ;C'est ça, diriger. | Pendant qu'on code… ;Il devrait plutôt faire les reviews. | Je le défie ce soir => Je parie sur lui.",
    "{chief} m'a offert un café ce matin. | Il est attentionné. ;Il m'en a offert un hier. | Il veut quelque chose. ;C'était un café ou un ticket déguisé ? | Ça change de d'habitude. ;Moi j'attends encore le mien. | Je lui en offre un demain => Il va être touché.",
    "Faut dire à {chief} qu'on veut une machine à pop-corn. | Excellente idée. ;Je signe la pétition. | Et un toboggan. ;Et un poney. | On a déjà tout ce qu'il faut. ;On a assez dépensé. | Je lui en parle au stand-up => Mets-moi en copie.",
  ] },
  { id: "meeting", w: 1, threads: [
    "Encore une réunion… | C'est la troisième aujourd'hui. ;J'en peux plus. | J'ai joué au morpion sur mon carnet. ;J'ai dormi les yeux ouverts. | Elle était utile, celle-là. ;Moi j'aime bien les réunions. | Cette réunion aurait pu être un mail => Clairement.",
    "Le stand-up a duré 40 minutes. | Il s'appelle stand-up pour une raison. ;Faut le chronométrer. | On devrait le faire en planche. ;J'ai pris racine. | Il y avait beaucoup de sujets. ;C'était important. | Demain je mets un minuteur => Excellente idée.",
  ] },
  { id: "nodesk", w: 6, when: c => c.noDesk, threads: [
    "On m'a vendu mon bureau… 😠 | C'est scandaleux. ;On va en parler à {chief}. | Au moins t'as une vue sur les plinthes. ;Le carton, c'est tendance. | Faut faire des économies, hein. ;Ça forge le caractère. | Je vais faire une pétition => Je signe.",
    "Je bosse sur un carton maintenant. | Je te prête une chaise. ;C'est pas possible, ça. | Un carton bio, au moins ? ;Très minimaliste. | Moi ça me dérangerait pas. ;C'est temporaire. | Mon dos me dit merci => Va voir le kiné.",
  ] },
  { id: "duel", w: 5, when: c => !!c.duel, threads: c => c.duel === "lost" ? [
    "J'ai perdu contre {chief}… je veux ma revanche. | La prochaine sera la bonne. ;On va s'entraîner ensemble. | Il te laisse jamais gagner. ;Fallait viser la gamelle. | Il est trop fort, accepte-le. ;C'était mérité. | Ce soir, revanche => Je viens supporter.",
    "{chief} triche, j'en suis sûr. | Je l'ai vu aussi ! ;Il a un truc, c'est sûr. | Il a soudoyé le gardien. ;Ou alors t'es nul. | Mauvais perdant, va. ;Il est juste meilleur. | Je vais l'observer => Moi aussi."]
    : ["J'ai battu {chief}, vous auriez vu ça ! | Bravo, champion ! ;Enfin quelqu'un ! | Il t'a laissé gagner, tu sais. ;Il était fatigué. | Un coup de chance. ;Attends la revanche. | Je vais le mettre sur l'ardoise => Encadre-la.",
      "Je suis imbattable aujourd'hui. | On dirait bien. ;Respect. | Attends que j'arrive. ;Joue contre {cat}. | Ça va pas durer. ;Viens jouer contre moi. | Qui veut m'affronter ? => Moi !"] },
  { id: "crush", w: 3, when: c => !!c.crush && c.crush !== c.a, threads: [
    "Bravo {crush} pour le coup de cœur du jour ! | Bien mérité. ;Il assure en ce moment. | Il va payer sa tournée. ;La prochaine fois, c'est moi. | Moi j'aurais voté {x}. ;Encore lui ? | On le félicite à l'afterwork => Avec plaisir.",
  ] },
  { id: "dish", w: 5, when: c => !!c.dish, threads: [
    "Il en reste ! Merci {cook} ! | J'en reprends volontiers. ;Il cuisine trop bien. | Je la planque dans le frigo. ;Je me bats pour la dernière part. | J'ai déjà mangé, merci. ;Un peu trop salé pour moi. | Faut qu'il nous donne la recette => Je lui demande.",
    "« {dish} » par {cook} : une tuerie. | J'adore, c'est délicieux. ;Il a un vrai talent. | Il devrait ouvrir un resto. ;Je me ressers en douce. | Bof, j'ai connu mieux. ;Un peu trop cuit. | On se le refait vendredi ? => Avec plaisir.",
  ] },
  { id: "coffeebroken", w: 5, when: c => c.coffeeBroken, threads: [
    "La machine du bureau est en panne. | Encore ? ;Heureusement qu'on a celle-ci. | C'est un complot. ;Café à la casserole ? | Ça nous fera du bien d'en boire moins. ;On survivra. | Quelqu'un prévient {chief} ? => J'y vais.",
  ] },
  /* ---------- the pets ---------- */
  { id: "cat", w: 2, threads: [
    "{cat} a encore dormi sur mon clavier. | Elle aime la chaleur. ;Elle est trop mignonne. | Elle a commité à ta place ? ;Elle fait de la review. | Elle met des poils partout. ;Faut lui apprendre. | Elle a écrit « jjjjjjjjj » dans mon code => Plus clair que le reste.",
    "{cat} a volé un bout de mon sandwich. | Elle a bon goût. ;Elle fait ça à tout le monde. | C'est elle la vraie cheffe. ;Elle a payé sa part ? | Faut pas la nourrir comme ça. ;Elle va grossir. | Elle a pris le jambon => Évidemment.",
    "T'as vu {cat} ce matin ? | Elle dormait sur le canapé. ;Elle était dans la cuisine. | Elle faisait le tour des bureaux. ;Elle a assisté au stand-up. | Non, elle se cache. ;Pas vue. | Faut lui remplir sa gamelle => Je m'en occupe.",
  ] },
  { id: "dog", w: 2, when: c => !!c.dog, threads: [
    "{dog} m'a rapporté une chaussette. | Il est adorable. ;C'est un cadeau. | C'est ta chaussette, en plus. ;Il veut que tu joues. | Où il l'a trouvée ? ;C'est dégoûtant. | Je lui lance la balle => Il va adorer.",
    "{dog} et {cat} s'entendent bien, finalement. | Oui, c'est mignon. ;Ils dorment ensemble parfois. | Ils préparent un coup. ;Elle le commande, en fait. | Pas toujours… ;Hier elle l'a griffé. | On devrait les prendre en photo => Pour le mur.",
  ] },
  /* ---------- the break room ---------- */
  { id: "activity", w: 4, when: c => c.actLines.length > 0, threads: c => c.actLines.map(l => `${l} | Bien joué ! ;Joli ! ;Continue comme ça. | T'as triché, là. ;Je filme, attends. ;J'ai vu mieux. | Ça compte pas. ;Pas convaincu. | On en refait une ? => Allez, la belle !`) },
  { id: "games", w: 2, threads: [
    "{b}, revanche au baby ? | Allez, je te prends. ;Chiche ! | Prépare-toi à pleurer. ;Pas de pissette, cette fois. | Plus tard, je suis crevé. ;Je me suis fait mal au poignet. | Le perdant paie les cafés => Marché conclu.",
    "Quelqu'un pour un ping-pong ? | Moi ! ;J'arrive. | Prépare ta raquette. ;Je joue de la main gauche, pour être sympa. | Pas maintenant. ;J'ai trop mangé. | Premier à 11 => C'est parti.",
    "On fait un tournoi ce soir ? | Bonne idée ! ;Je m'inscris. | Je gagne, c'est déjà écrit. ;Avec des trophées ? | Ce soir je peux pas. ;Encore un tournoi ? | Je l'écris sur l'ardoise => Mets-moi en premier.",
  ] },
  { id: "room", w: 1, when: c => !!c.best, threads: [
    "T'as vu le nouveau {best} ? | Grave, il est magnifique. ;C'est devenu mon coin préféré. | On devrait faire payer l'entrée. ;Il manque un jacuzzi. | Ça a dû coûter une blinde. ;Un peu trop pour moi. | {chief} s'est fait plaisir => On en profite.",
    "On est bien installés, franchement. | Mieux qu'à la maison. ;C'est le paradis ici. | Je déménage ici. ;Je dors sur le canapé ce soir. | Il manque encore des choses. ;C'est un peu chargé. | Merci {chief} => Il a bon goût.",
  ] },
  { id: "music", w: 3, when: c => c.music, threads: [
    "Qui a mis cette chanson ? | C'est moi, et j'assume. ;Elle est top ! | C'est {x}, il a des goûts bizarres. ;C'est {cat}, elle a marché sur le jukebox. | Change, pitié. ;Un peu fort, non ? | J'ai une meilleure playlist => Mets-la.",
    "Monte le son, j'adore ! | Allez, on danse ! ;C'est mon morceau préféré. | Je danse pas, je débugge. ;Chut, je me concentre. | Moins fort, il y a des gens qui bossent. ;Pas fan. | On fait une soirée karaoké ? => Je suis partant.",
  ] },
  /* ---------- outside ---------- */
  { id: "season", w: 2, threads: c => ({
    hiver: ["Il caille dehors ! | J'ai mis trois pulls. ;Chocolat chaud, quelqu'un ? | Je vais hiberner ici. ;Le radiateur est à moi. | Moi j'aime bien le froid. ;Ça va, c'est pas si froid. | Vivement le printemps => Encore trois mois…",
      "J'ai vu de la neige ce matin. | C'était beau ! ;Il en tombait beaucoup ? | On fait un bonhomme sur la terrasse ? ;Les bugs gèlent aussi ? | C'était de la pluie gelée. ;Ça a fondu tout de suite. | On mange une raclette ce soir => Vendu."],
    printemps: ["Ça sent le printemps. | Les arbres sont en fleurs. ;Enfin du soleil ! | Et le rhume des foins. ;Mon pollen préféré. | Il fait encore froid le matin. ;Il pleut toujours. | On mange sur la terrasse ? => Bonne idée."],
    "été": ["Il fait trop chaud. | La clim, vite ! ;Je fonds. | On code en maillot ? ;Mon PC chauffe autant que moi. | Moi j'adore la chaleur. ;C'est l'été, c'est normal. | Vivement les vacances => Plus que deux semaines."],
    automne: ["Les feuilles tombent… | C'est joli, l'automne. ;Ça sent les châtaignes. | Comme mes tests. ;C'est la saison des bugs. | Ça sent surtout la pluie. ;J'aime pas cette saison. | C'est la saison des soupes => Je fais une soupe au potiron demain.",
      "Il pleut tous les jours. | Pareil, j'en ai marre. ;Bon temps pour coder. | Même la CI pleure. ;Je viens en bateau demain. | Ça fait du bien à la nature. ;Moi j'aime la pluie. | J'ai oublié mon parapluie => Je te prête le mien."],
  })[c.season] || [] },
  { id: "holiday", w: 4, when: c => !!c.holiday, threads: c => c.holiday === "halloween" ? [
    "Tu te déguises pour Halloween ? | Oui, en zombie ! ;Je sais pas encore. | En bug de prod, le plus effrayant. ;En {chief}. | Pas trop mon truc. ;C'est pour les enfants. | J'ai des bonbons dans mon tiroir => Je passe te voir.",
    "Le pire monstre, c'est un bug en prod. | Le vendredi à 18 h. ;Sans les logs. | Avec un client au téléphone. ;Et la CI en vacances. | Moi c'est les araignées. ;Les réunions, plutôt. | Joyeux Halloween => Bouh !"] : [
    "Tu fais quoi pour Noël ? | En famille, comme chaque année. ;Je pars à la montagne. | Je code mon cadeau. ;Je mange, surtout. | Rien, je travaille. ;Je reste chez moi. | On fait un Secret Santa ? => Je participe !",
    "J'ai déjà mis le sapin chez moi. | Trop bien ! ;Moi pas encore. | En octobre ? ;Avec des guirlandes RGB ? | C'est trop tôt. ;Pas de sapin chez moi. | Je vais en mettre un ici => {chief} va adorer."] },
  /* ---------- events ---------- */
  { id: "hackathon", w: 8, when: c => c.hackathon, threads: [
    "T'as une idée pour le hackathon ? | Oui, un bot qui commande les pizzas ! ;Je pensais à un tableau de bord pour {cat}. | Un détecteur de café vide. ;Une IA qui fait la sieste à ma place. | Pas encore, je cherche. ;Je suis à court d'idées. | On fait équipe ? => Carrément !",
    "On code tout en une heure, c'est fou. | C'est ça qui est drôle ! ;J'adore l'énergie. | On dort quand ? ;Les tests, ce sera pour demain. | Trop de pression pour moi. ;Je préfère prendre mon temps. | Démo à la fin ? => Je prépare les slides.",
    "Le hackathon, c'est le meilleur moment du mois. | Grave, on se lâche. ;On apprend plein de trucs. | Surtout pour les pizzas. ;Et le droit de coder en chaussettes. | Moi ça me stresse un peu. ;Je préfère mes tickets. | L'an dernier on a gagné => Cette année aussi !",
  ] },
  { id: "welcome", w: 8, when: c => !!c.welcome, threads: c => c.welcome.map(n => `Bienvenue à ${n} dans l'équipe ! | Ravi de l'accueillir. ;Il a l'air sympa. | On lui fait le coup de la machine à café ? ;Il va découvrir la CI rouge. | Encore un qui va me piquer mon pouf. ;On était bien à huit. | Je lui fais visiter => Bonne idée, montre-lui la salle de repos.`)
    .concat(["Santé, pour les nouveaux ! 🥂 | Santé ! ;À l'équipe ! | Ils vont pas tenir une semaine. ;On les bizute au baby ? | Je trinque au jus d'orange. ;Moi je bosse encore. | Il reste du gâteau ? => Une part, pour toi."]) },
  /* ---------- life ---------- */
  { id: "hobby", w: 3, threads: [
    "T'as vu le match hier soir ? | Oui, quel final ! ;J'ai vu la fin seulement. | J'ai regardé le replay du replay. ;Je suis encore en colère. | Je regarde pas le sport. ;J'ai dormi devant. | On le regarde ensemble la prochaine fois ? => Je ramène les chips.",
    "J'ai commencé une nouvelle série de science-fiction. | Elle est bien ? ;J'adore la SF, laquelle ? | Combien d'épisodes cette nuit ? ;Encore une série avec des robots ? | La SF, c'est pas mon truc. ;J'ai pas le temps pour les séries. | Je t'envoie le titre => Super, merci.",
    "Je me suis mis à la guitare. | Trop bien, tu joues quoi ? ;J'en faisais aussi ! | Joue-nous un truc à l'afterwork. ;Tes voisins doivent t'adorer. | J'ai jamais réussi. ;C'est dur, la guitare. | J'arrive à faire trois accords => C'est un début.",
    "J'ai lu un livre génial ce week-end. | Lequel ? ;Prête-le-moi. | Un livre de code ? ;Un livre de recettes ? | Je lis pas trop. ;J'ai pas le temps de lire. | Je te le ramène demain => Merci !",
    "J'ai tenté de faire du pain. | Alors, réussi ? ;J'adore le pain maison. | Il ressemblait à une brique ? ;Tu nous en fais goûter ? | C'est trop long, le pain. ;Moi j'achète à la boulangerie. | Il était un peu plat => La prochaine sera la bonne.",
    "J'ai fait une rando incroyable. | Où ça ? ;Montre les photos ! | T'as vu des marmottes ? ;Tu t'es perdu combien de fois ? | Trop de marche pour moi. ;Je préfère le canapé. | La prochaine fois, je t'emmène => Avec plaisir.",
    "J'ai planté des tomates sur mon balcon. | Trop bien ! ;Elles poussent ? | Tu nous fais une salade ? ;Elles ont des noms ? | J'ai pas la main verte. ;Ça marche jamais chez moi. | Il y en a déjà trois => Bravo le jardinier.",
    "Je cherche une nouvelle série, des idées ? | J'en ai une super à te conseiller. ;Regarde la série de science-fiction de {x}. | Des tutos sur le CSS. ;Le replay des stand-ups. | Je regarde plus de séries. ;Aucune idée, désolé. | Envoie-moi tes idées => Je te fais une liste.",
  ] },
  { id: "deep", w: 1, threads: [
    "Si t'étais un langage, tu serais lequel ? | Python, simple et gentil. ;Go, efficace. | COBOL, vieux mais solide. ;JavaScript, imprévisible. | Bonne question… ;Laisse-moi réfléchir. | Moi je serais Rust => Strict mais juste.",
    "Le meilleur bug de ta vie ? | Un bug qui affichait la date de 1970. ;Un prix à -1 euro. | Mon bug préféré, c'est toi. ;Celui qui m'a fait rire en prod. | Je préfère oublier. ;J'en ai trop. | Moi c'était un fuseau horaire => Le classique.",
    "Tu ferais quoi si t'étais pas dev ? | Boulanger, sans hésiter. ;Prof, je crois. | Testeur de canapés. ;Chat de bureau, comme {cat}. | Dev, encore. ;Je me pose jamais la question. | Moi musicien => Joue-nous un truc.",
    "Un an sans Internet, tu tiendrais ? | Peut-être, avec des livres. ;Ça me ferait du bien. | Une heure, maximum. ;Je commencerais par pleurer. | Impossible. ;Jamais de la vie. | On essaie une journée ? => Demain, alors.",
  ] },
  /* ---------- the two of them ---------- */
  { id: "friend", w: 3, when: c => c.rel >= 60, threads: [
    "{b}, t'es vraiment le meilleur. | Toi aussi, sérieux. ;Arrête, je vais rougir. | Tu veux quoi en échange ? ;C'est pour mon dernier croissant ? | C'est toi le meilleur. ;Tu exagères. | Je le pense vraiment => Merci, ça me touche.",
    "On se fait un resto ce soir, {b} ? | Avec plaisir ! ;Où tu veux. | Seulement si tu paies. ;Encore des pizzas ? | Ce soir je peux pas, désolé. ;Demain plutôt ? | On réserve pour 20 h ? => Ça marche.",
    "Merci pour ton aide hier, {b}. | Avec plaisir, c'est normal. ;Toujours là pour toi. | Tu me dois un café. ;Facture à suivre. | C'était rien. ;J'ai pas fait grand-chose. | Tu m'as sauvé la journée => Pareil pour toi la prochaine fois.",
  ] },
  { id: "foe", w: 3, when: c => c.rel < -20, threads: [
    "Tiens, {b}… 🙄 | Salut quand même. ;Ça va, toi ? | Toujours aussi aimable. ;Joli regard. | Quoi, encore ? ;T'as un problème ? | On devrait se parler, vraiment => Si tu veux.",
    "{b}, rends-moi mon mug. | Ah, c'était le tien ? ;Désolé, je te le rends. | Il est plus à toi, il m'a choisi. ;Le mug, je l'ai adopté. | Il est pas à toi. ;Prouve-le. | Il a mon prénom dessus => Bon, d'accord.",
    "C'est toi qui as cassé la CI, {b} ? | Oui… désolé, je répare. ;C'est possible. | La CI avait besoin de vacances. ;Elle était déjà cassée. | N'importe quoi. ;Toujours à accuser les autres. | Faut qu'on vérifie ensemble => Ok, après la pause.",
  ] },
  { id: "ask", w: 3, threads: [
    "{b}, tu bosses sur quoi ? | Un ticket sur le paiement. ;Une grosse refonte. | Sur ma pause café, surtout. ;Sur ma patience. | C'est confidentiel. ;Rien d'intéressant. | Je te montre après la pause => Avec plaisir.",
    "Ça avance, ton ticket, {b} ? | Bien, presque fini. ;Doucement mais sûrement. | Il recule, en fait. ;Il avance à reculons. | C'est la galère, me parle pas. ;Pas du tout. | Si tu veux, on s'y met à deux => Merci, t'es un chef.",
    "{b}, t'as une minute ? | Bien sûr, dis-moi. ;Pour toi, toujours. | Une minute, pas deux. ;Ça dépend du sujet. | Pas maintenant, désolé. ;Je suis sous l'eau, là. | C'est pour un bug bizarre => Montre-moi.",
    "{b}, t'as des nouvelles de {x} ? | Il va bien, il bosse dur. ;Je l'ai vu ce matin. | Il est en mission secrète. ;Il hiberne. | Aucune idée. ;On se parle pas trop. | Je vais lui envoyer un message => Dis-lui bonjour.",
    "Alors {b}, quoi de neuf ? | Pas grand-chose, et toi ? ;J'ai fini mon ticket ! | J'ai un nouveau bug, ça compte ? ;J'ai changé de fond d'écran. | Rien du tout. ;Toujours la même chose. | Moi j'ai une idée pour l'équipe => Raconte !",
  ] },
  { id: "gossip", w: 1, threads: [
    "{x} a l'air fatigué ces temps-ci. | J'avais remarqué aussi. ;On devrait lui parler. | Il a dû voir un test vert. ;Il code la nuit. | Laisse-le tranquille. ;Il va bien, je t'assure. | Je lui propose un café => Bonne idée.",
    "{x} a fait une blague en stand-up, incroyable. | Elle était drôle en plus ! ;Il se lâche. | Une fois par an, comme Noël. ;Il a dû la répéter. | Moi je l'ai pas comprise. ;C'était pas une blague, je crois. | Faut l'encourager => Ha ha, on applaudit demain.",
  ] },
];
