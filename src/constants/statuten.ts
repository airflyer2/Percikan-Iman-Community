export interface StatuteSubClause {
  label: string;
  text: string;
}

export interface StatuteArticle {
  number: number;
  title: string;
  zgbReference?: string;
  content: string[];
  subsections?: StatuteSubClause[];
}

export interface SwissVereinLegalInfo {
  officialName: string;
  shortName: string;
  legalForm: string;
  zgbBasis: string;
  seatCity: string;
  canton: string;
  country: string;
  postalAddress: string;
  email: string;
  iban: string;
  bankName: string;
  foundingYear: number;
  vision: string;
  uidChe?: string;
  documentDate: string;
  documentRef: string;
  approvalDate: string;
  approvalAssembly: string;
  validityClause: string;
  president: string;
  minuteKeepers: string[];
  generalAssemblyTerm: string;
  votingAge: string;
  passiveVotingAge: string;
  boardElectionCycle: string;
  boardTermLimit: string;
  signingAuthority: string;
  liabilityClause: string;
  taxExemptionStatus: string;
  revisionsstelle: string;
  dissolutionRequirement: string;
  officialLanguage: string;
}

export const SWISS_VEREIN_LEGAL_INFO: SwissVereinLegalInfo = {
  officialName: 'Verein "Percikan Iman"',
  shortName: 'Percikan Iman',
  legalForm: 'Verein im Sinne von Art. 60–79 ZGB',
  zgbBasis: 'Art. 60–79 ZGB',
  seatCity: 'Zürich',
  canton: 'Zürich (ZH)',
  country: 'Schweiz / Switzerland',
  postalAddress: 'Verein Percikan Iman, 8000 Zürich',
  email: 'info@percikaniman.ch',
  iban: 'CH89 0900 0000 6049 6610 7',
  bankName: 'PostFinance',
  foundingYear: 2012,
  uidChe: 'CHE-382.914.820',
  vision: 'Der Aufbau von muslimischen Generationen, die solide, vertrauenswürdig und ausdauernd sind, sowie zu einer der Säulen der muslimischen Gemeinschaft in der Schweiz im Besonderen und in Europa im Allgemeinen werden.',
  documentDate: '07. Januar 2025',
  documentRef: 'PERCIKAN_IMAN_STATUTEN_20250107_FINAL',
  approvalDate: '23. Februar 2025',
  approvalAssembly: 'Konstituierende Vereinsversammlung vom 23. Februar 2025',
  validityClause: 'Sie gelten ab sofort.',
  president: 'Muharronif',
  minuteKeepers: ['Michael T. Stumpp', 'Lusiana'],
  generalAssemblyTerm: 'Jährlich im ersten Quartal (bzw. bei Ramadan spätestens so früh wie möglich im zweiten Quartal)',
  votingAge: 'Ab dem 16. Altersjahr (1 Stimme pro Mitglied)',
  passiveVotingAge: 'Ab dem 18. Lebensjahr (Recht, in ein Amt gewählt zu werden)',
  boardElectionCycle: 'Alle drei Jahre Gesamterneuerungswahlen durch die Vereinsversammlung',
  boardTermLimit: 'Wiederwählbar bis maximal sieben Amtsperioden',
  signingAuthority: 'Kollektivunterschrift zu zweien (eine Unterschrift zwingend vom Präsidenten oder von einem Vizepräsidenten)',
  liabilityClause: 'Ausschliessliche Haftung des Vereinsvermögens; Erwerbs- und Selbsthilfezwecke sind statutarisch ausgeschlossen.',
  taxExemptionStatus: 'Ideeller Verein ohne Erwerbszweck; bei Liquidation fallen Restmittel einer steuerbefreiten Schweizer Institution zu.',
  revisionsstelle: 'Mindestens zwei Revisoren aus der Versammlung oder extern (nicht im Vorstand)',
  dissolutionRequirement: 'Zweidrittelmehrheit aller Mitglieder',
  officialLanguage: 'Deutsch (bei Unstimmigkeiten zwischen Versionen gilt immer die deutsche Version)',
};

export const OFFICIAL_SWISS_STATUTEN: StatuteArticle[] = [
  {
    number: 1,
    title: 'Name und Sitz',
    zgbReference: 'Art. 60–79 ZGB',
    content: [
      'I. Unter dem Namen "Percikan Iman" besteht mit Sitz in Zürich ein Verein im Sinne von Art. 60-79 ZGB.',
      'II. Die Dauer des Vereins ist unbeschränkt.',
      'III. Der Verein verfolgt weder Erwerbs- noch Selbsthilfezwecke.',
    ],
  },
  {
    number: 2,
    title: 'Zweck und Zielsetzungen',
    zgbReference: 'Art. 60 Abs. 1 ZGB',
    content: [
      'Der Verein "Percikan Iman" bezweckt folgendes:',
    ],
    subsections: [
      {
        label: 'I.',
        text: 'Organisation regelmässiger Treffen zur Vermittlung von vertieftem Wissen über den Islam. Durch Vorträge, Unterricht und gemeinsamen Anlässen soll das Wissen und das Verständnis seiner Mitglieder für ihre Religion gefördert bzw. gefestigt und vertieft werden.',
      },
      {
        label: 'II.',
        text: 'Unterstützung bei der Strukturenbildung sowie des Angebots in Bezug auf die Südostasiatisch-Muslimische Kultur sowie den diesbezüglichen Quellen. Hierzu zählen islamische Werke, Unterrichtsmaterial etc. sowie entsprechende Kommunikationsstrukturen.',
      },
      {
        label: 'III.',
        text: 'Unterstützung von Mitgliedern im Kontakt mit Behörden, Schulen, etc. Insbesondere soll er im Rahmen seiner Möglichkeiten die religiösen, sozialen und kulturellen Interessen gegenüber den Behörden wahrnehmen.',
      },
      {
        label: 'IV.',
        text: 'Er kann aktiv auf Behörden und andere Organisationen zugehen, um die Vereinsziele zu vertreten.',
      },
      {
        label: 'V.',
        text: 'Er setzt sich dafür ein, dass seine Mitglieder ihre religiösen Pflichten ausüben können.',
      },
      {
        label: 'VI.',
        text: 'Der Verein setzt sich aktiv für den interreligiösen Dialog ein, um das gegenseitige Verständnis zwischen verschiedenen Religionsgemeinschaften zu stärken und zur Förderung des gesellschaftlichen Zusammenhalts beizutragen. Zusätzlich engagiert sich der Verein in gemeinnützigen Aktivitäten, die darauf abzielen, das soziale Wohl und die kulturelle Bereicherung der Gemeinschaft zu unterstützen.',
      },
      {
        label: 'VII.',
        text: 'Insbesondere sind der Organisation und Mithilfe zur islamischen Erziehung von Kindern und Jugendlichen grösster Wert beizumessen.',
      },
      {
        label: 'VIII.',
        text: 'Die Tätigkeit des Vereins "Percikan Iman" darf nicht im Widerspruch zu den vorgängig erwähnten Zielen, zur islamischen Ethik, islamischen Grundsätzen und Gesetz stehen.',
      },
      {
        label: 'IX.',
        text: 'Zur Erreichung der Ziele des Vereins, kann dieser mit anderen Organisationen, welche ähnliche Ziele verfolgen oder bei Dachorganisationen mitarbeiten.',
      },
    ],
  },
  {
    number: 3,
    title: 'Vermögen',
    zgbReference: 'Art. 60 Abs. 2 ZGB',
    content: [
      'Die Einkünfte des Vereins "Percikan Iman" setzen sich wie folgt zusammen:',
    ],
    subsections: [
      { label: 'I.', text: 'Geschenke und Zuwendungen.' },
      { label: 'II.', text: 'Einkommen aus den verschiedenen Aktivitäten des Vereins "Percikan Iman".' },
      { label: 'III.', text: 'Anderen gesetzlich erlaubten Einkünften.' },
      { label: 'IV.', text: 'Mitgliederbeiträge.' },
    ],
  },
  {
    number: 4,
    title: 'Ausrichtung von Vereinsleistungen',
    zgbReference: 'Art. 69 ZGB',
    content: [
      'I. Im Rahmen des Vereinszweckes steht die Ausrichtung von Vereinsleistungen im freien Ermessen des Vereinsvorstands.',
      'II. Zur Erfüllung des Vereinszwecks steht dem Vereinsvorstand das Vereinsvermögen zur Verfügung. Der Vorstand kann dazu selbständig über einen anlässlich der Vereinsversammlung bestimmten maximalen einmaligen Betrag resp. bei sich wiederholenden Ausgaben über einem maximalen Betrag pro Jahr und Projekt entscheiden. Höhere Ausgaben bedürfen zwingend der Genehmigung durch die Vereinsversammlung.',
    ],
  },
  {
    number: 5,
    title: 'Mitgliedschaft',
    zgbReference: 'Art. 70–72 ZGB',
    content: [
      'I. Die Mitgliedschaft steht ausschliesslich natürlichen Personen offen, die ein Interesse an der südostasiatisch-muslimischen Kultur haben.',
    ],
    subsections: [
      {
        label: 'II. Beitritt',
        text: 'Wer dem Verein "Percikan Iman" beitreten will, stellt zuhanden dem Vorstand ein Gesuch.\na. Die Aufnahme kann durch den Vorstand ohne Angabe von Gründen verweigert werden.\nb. Nach einer provisorischen Aufnahme durch den Vorstand entscheidet die Vereinsversammlung an deren nächsten Sitzung abschliessend darüber.',
      },
      {
        label: 'III. Erlöschen',
        text: 'Die Mitgliedschaft erlischt bei natürlichen Personen automatisch mit dem Tod.',
      },
      {
        label: 'IV. Austritt',
        text: 'Mitglieder können durch eine schriftliche Mitteilung an den Vorstand jederzeit ihren Austritt erklären. Der Austritt ist, sofern nicht anders im Austrittsgesuch angegeben, per sofort gültig. Mit dem vollzogenen Austritt entfallen auch Mitgliedsbeiträge. Bereits entrichtete Mitgliedsbeiträge werden nicht rückerstattet.',
      },
      {
        label: 'V. Ausschluss (Gründe)',
        text: 'Ein Mitglied kann nach vorheriger Mahnung aus dem Verein ausgeschlossen werden, wenn es die Vereinsinteressen gefährdet, dem Vereinszweck zuwiderhandelt oder das Ansehen des Vereins schädigt. In begründeten Fällen kann von einer Mahnung abgesehen werden.',
      },
      {
        label: 'VI. Beitragsrückstand',
        text: 'Weiter können Mitglieder ausgeschlossen werden, die trotz zweimaliger Mahnung ihre Mitgliedsbeiträge innert angemessener Frist nicht entrichten.',
      },
      {
        label: 'VII. Ausschluss ohne Angabe',
        text: 'Der Ausschluss kann auch ohne Angabe von Gründen erfolgen.',
      },
      {
        label: 'VIII. Entscheidung durch den Vorstand',
        text: 'Der Vorstand trifft die Entscheidung über den Ausschluss eines Mitglieds. Diese Entscheidung basiert auf einer sorgfältigen Prüfung des Verhaltens des Mitglieds in Bezug auf die genannten Kriterien.',
      },
      {
        label: 'IX. Rechtswirkung',
        text: 'Der Entscheid des Vorstands ist endgültig und wird dem Mitglied schriftlich mitgeteilt. Er entfaltet ab dem Zeitpunkt der Mitteilung Rechtwirkung.',
      },
      {
        label: 'X. Pflichten & Entfall',
        text: 'Ab dem Datum des wirksamen Ausschlusses entfällt die Pflicht zur Zahlung von Mitgliedsbeiträgen. Davon unberührt bleibt der Mitgliedsbeitrag des laufenden Jahres. Das ausgeschlossene Mitglied hat keinen Anspruch auf Rückzahlungen bereits geleisteter Beiträge oder einen Anteil am Vereinsvermögen.',
      },
    ],
  },
  {
    number: 6,
    title: 'Mitgliederbeiträge',
    zgbReference: 'Art. 71 ZGB',
    content: [
      'I. Die Jahresbeiträge werden jährlich entsprechend der Budgetvorlage von der Vereinsversammlung auf Vorschlag des Vorstandes festgelegt.',
      'II. Die Mitgliederbeiträge sind jährlich und im Voraus zu entrichten:',
    ],
    subsections: [
      {
        label: 'a.',
        text: 'Der Mitgliederbeitrag ist innerhalb von zwei Monaten nach der Vereinsversammlung zu bezahlen.',
      },
      {
        label: 'b.',
        text: 'Mitglieder, die ihren Beitrag nicht fristgerecht zahlen, dürfen weder wählen noch gewählt werden. Zudem dürfen sie bei Abstimmungen über Geschäften nicht teilnehmen.',
      },
      {
        label: 'c.',
        text: 'Neue Mitglieder haben den Mitgliederbeitrag innert 30 Tagen nach der Aufnahme zu zahlen.',
      },
      {
        label: 'd.',
        text: 'Entrichtete Beiträge werden nicht zurückerstattet.',
      },
      {
        label: 'III. Ausnahmeregelungen bei Härtefällen',
        text: 'Der Vorstand kann bei begründeten finanziellen Engpässen auf schriftlichen Antrag eines Mitglieds auf drei Jahre befristete Ausnahmeregelungen erlassen. Nach Ablauf der Frist ist durch das betreffende Mitglied ein neuer Antrag zu stellen, der durch den Vorstand neu geprüft werden muss. An der Vereinsversammlung ist über die Anzahl der Ausnahmen jährlich zu berichten.',
      },
    ],
  },
  {
    number: 7,
    title: 'Organe',
    zgbReference: 'Art. 64 ff. ZGB',
    content: [
      'Die Organe des Vereins "Percikan Iman" sind:',
    ],
    subsections: [
      { label: 'I.', text: 'Vereinsversammlung' },
      { label: 'II.', text: 'Vorstand' },
      { label: 'III.', text: 'Revisionsstelle' },
    ],
  },
  {
    number: 8,
    title: 'Vereinsversammlung',
    zgbReference: 'Art. 64–68 ZGB',
    content: [
      'I. Die Vereinsversammlung ist das oberste Organ des Vereins "Percikan Iman". Sie wird vom Vorstand von sich aus mind. jährlich oder auf Verlangen von mind. 1/5 der Mitglieder mindestens 1 Monat vor dem Termin einberufen.',
      'II. Die ordentliche Vereinsversammlung findet jedes Jahr im ersten Quartal statt. Sollte im ersten Quartal auch der Fastenmonat Ramadan liegen, findet die ordentliche Vereinsversammlung spätestens so früh wie möglich im zweiten Quartal statt.',
      'III. Sollte ein Vereinstreffen im ersten Quartal stattfinden, wird die Vereinsversammlung entweder vor oder nach diesem Treffen abgehalten.',
      'IV. In der Vereinsversammlung hat jedes Mitglied ab dem 16. Altersjahr eine Stimme. Das passive Wahlrecht, also das Recht, in ein Amt gewählt zu werden, steht Mitgliedern ab dem 18. Lebensjahr zu.',
    ],
    subsections: [
      {
        label: 'V. Befugnisse & Beschlussfassung',
        text: 'Die Vereinsversammlung wählt an ihrer Vereinsversammlung die übrigen Organe des Vereins "Percikan Iman", genehmigt Jahresbericht, Jahresrechnung und Budget. Sie beschliesst mit einfachem Mehr der anwesenden Mitglieder über alle weiteren Geschäfte, die ihr vom Vorstand oder aus ihrer Mitte vorgelegt werden. Bei Stimmgleichheit zählt die Stimme des Vorsitzenden doppelt.',
      },
      {
        label: 'VI. Antragsfrist',
        text: 'Anträge von Mitgliedern an die Vereinsversammlung sind dem Vorstand spätestens 21 Tage vor dem Termin der Vereinsversammlung schriftlich einzureichen.',
      },
      {
        label: 'VII. Protokoll & Sprache',
        text: 'Über die Verhandlungen und Beschlüsse ist Protokoll zu führen, das spätestens 30 Tage vor einer neu einberufenen Versammlung den Mitgliedern zugesandt wird. Protokoll- und Verhandlungssprache sind Deutsch.',
      },
      {
        label: 'VIII. Einladung & Traktanden',
        text: 'Ort und Datum werden durch den Präsidenten bestimmt und mindestens zwei Wochen vor dem Termin schriftlich den Mitgliedern bekannt gegeben. Dabei werden folgende Traktanden regelmässig behandelt:\na. Kontrolle der Tätigkeiten des Vereins "Percikan Iman".\nb. Überprüfung des geplanten Tätigkeitsprogramms betreffend Vereinbarkeit mit den Zwecken des Vereins "Percikan Iman". Die Vereinsversammlung ist berechtigt, bezüglich des Tätigkeitsprogramms Änderungen oder Korrekturen anzuordnen.\nc. Wahl des Vorstandes und der Revisoren (nur alle 3 Jahre).\nd. Die Vereinsversammlung berät und beschliesst im Rahmen der Statuten über die für die geplanten Tätigkeiten notwendigen personellen und materiellen Mittel.\ne. Entlastung des Vorstands.\nf. Genehmigung des Jahresberichts, Jahresrechnung und Budget für das nächste Jahr.',
      },
      {
        label: 'IX. Protokollführung durch zwei Mitglieder',
        text: 'Die Vereinsversammlung beauftragt jeweils zwei seiner volljährigen Mitglieder mit der Protokollführung und der Ausarbeitung einer Protokollzusammenfassung. Die Protokolle sind durch den Vorsitzenden und die Protokollführer zu unterzeichnen.',
      },
      {
        label: 'X. Einfache Mehrheit',
        text: 'Beschlüsse der Vereinsversammlung werden mit einfacher Mehrheit der anwesenden oder vertretenen gültigen Stimmen gefasst.',
      },
      {
        label: 'XI. Statutenänderungen (Zweidrittelmehrheit)',
        text: 'Statutenänderungen bedürfen einer Zweidrittelmehrheit der anwesenden oder vertretenen stimmberechtigten Mitglieder.',
      },
      {
        label: 'XII. Ausstandspflicht bei Abstimmungen',
        text: 'Bei Abstimmungen treten Mitglieder in den Ausstand, wenn sie:\na. In der Sache ein persönliches Interesse haben;\nb. mit dem betroffenen Vorstandsmitglied verheiratet sind oder waren, in gerader Linie oder bis zum 3. Grad verwandt oder verschwägert sind, oder aus anderen Gründen (Freundschaft/Feindschaft) befangen sein könnten;\nc. Aus anderen Gründen, insbesondere wegen Freundschaft oder Feindschaft mit einer Partei oder ihrer Vertretung, befangen sein könnten.',
      },
      {
        label: 'XIII. Versammlungsvorsitz',
        text: 'Den Vorsitz in der Vereinsversammlung führt der Präsident, in dessen Verhinderung sein Stellvertreter. Wenn auch dieser verhindert ist, so führt das an Jahren älteste anwesende Vorstandsmitglied den Vorsitz.',
      },
      {
        label: 'XIV. Vertretung bei Abwesenheit',
        text: 'Ein abwesendes stimmberechtigtes Vereinsversammlungsmitglied kann sich durch ein anderes stimmberechtigtes Mitglied vertreten lassen. Jede Vertretung benötigt eine schriftliche Bestätigung zuhanden des Vorstands.',
      },
      {
        label: 'XV. Ehrenamtliche Tätigkeit',
        text: 'Die Mitglieder der Vereinsversammlung arbeiten unentgeltlich.',
      },
    ],
  },
  {
    number: 9,
    title: 'Vorstand',
    zgbReference: 'Art. 69 ZGB',
    content: [
      'I. Der Vorstand besteht aus mindestens drei Personen, die von der Vereinsversammlung aus der Reihe der volljährigen Mitglieder für folgende Funktionen gewählt werden, wobei der Vorstand die Funktionen selbst zuteilen kann, sofern nicht einzelne Funktionen an der Vereinsversammlung bestimmt werden:',
    ],
    subsections: [
      {
        label: 'Funktionen (Abs. I)',
        text: 'a. Präsident/Präsidentin: Er/Sie führt die laufenden Geschäfte des Vereins. Er/Sie vertritt den Verein nach aussen. Er/Sie führt den Vorsitz in der Vereinsversammlung und im Vorstand.\nb. Vizepräsident/Vizepräsidentin (Eine(n) oder mehrere): Er/Sie unterstützt den Präsidenten/die Präsidentin bei der Führung der Vereinsgeschäfte. Er/Sie führt Protokolle der Vereinsversammlung und des Vorstands.\nc. Kassierer/Kassiererin: Er/Sie ist für die ordnungsgemässe Buchführung des Vereins verantwortlich.\nd. Beisitzer (falls mehr als 3 Personen im Vorstand sind).',
      },
      {
        label: 'II. Gesamterneuerungswahlen (alle 3 Jahre)',
        text: 'Durch die Vereinsversammlung finden alle drei Jahre Gesamterneuerungswahlen für den Vorstand statt. Im Wahljahr wird jeweils die Anzahl der Vorstandsmitglieder bestimmt.',
      },
      {
        label: 'III. Offene Wahlen',
        text: 'Wahlen finden offen statt.',
      },
      {
        label: 'IV. Wiederwählbarkeit',
        text: 'Die Vorstandsmitglieder sind wiederwählbar (bis maximal sieben Amtsperioden).',
      },
      {
        label: 'V. Kollegium',
        text: 'Der Vorstand entscheidet als Kollegium.',
      },
      {
        label: 'VI. Beschlussfassung & Stichentscheid',
        text: 'Beschlüsse werden mit der Mehrheit der Anwesenden entschieden, bei Stimmengleichheit hat der Präsident eine zweite Stimme.',
      },
      {
        label: 'VII. Ausstand im Vorstand',
        text: 'Bei Abstimmungen treten Vorstandsmitglieder in den Ausstand, wenn sie in der Sache ein persönliches Interesse haben, mit Betroffenen bis zum 3. Grad verwandt/verschwägert sind oder durch Freundschaft/Feindschaft befangen sein könnten.',
      },
      {
        label: 'VIII. Kommissionen und Fachexperten',
        text: 'Der Vorstand ist berechtigt, für bestimmte Aufgaben andere Personen oder permanente Kommissionen einzusetzen, denen teilweise auch Nichtmitglieder oder Fachexperten angehören können. Diese beauftragten Personen oder Kommissionen sind gegenüber dem Vorstand rechenschaftspflichtig, der laufend, spätestens aber in seinem Jahresbericht über deren Tätigkeiten informiert.',
      },
      {
        label: 'IX. Deutsche Sprache',
        text: 'Jedes Mitglied des Vorstandes beherrscht die deutsche Sprache.',
      },
      {
        label: 'X. Vakanzen während der Amtsdauer',
        text: 'Während der Amtsdauer ausscheidende Vorstandsmitglieder können vom Vorstand ersetzt werden. An der folgenden Vereinsversammlung traktandiert der Vorstand eine Wahl für die von ihm gefüllten Position. Die gewählte Person ist bis zur nächsten Gesamterneuerungswahl im Amt. Sollte die Zahl der durch die Vereinsversammlung gewählten Vorstandsmitglieder unter drei sinken, muss innert drei Monaten eine Vereinsversammlung stattfinden.',
      },
      {
        label: 'XI. Abwahl von Vorstandsmitgliedern',
        text: 'Ein bestehendes Vorstandsmitglied kann auf Verlangen von zwei Dritteln der anwesenden Mitglieder an der nächsten Vereinsversammlung abgewählt werden.',
      },
      {
        label: 'XII. Aufgaben & Vertretung',
        text: 'a. Durchführung der durch die Vereinsversammlung gefassten Beschlüsse.\nb. Kontrolle der Tätigkeiten des Vereins "Percikan Iman".\nc. Beharrliche Verfolgung der Zwecke des Vereins "Percikan Iman".\nd. Er trägt die Verantwortung für das Vermögen des Vereins "Percikan Iman". Er hat die Kompetenz, die von der Vereinsversammlung bewilligten und zur Führung und Verwaltung benötigten Gelder auszugeben. Über die Einnahmen und Ausgaben wird genau Buch geführt und am Jahresende eine Bilanz erstellt.\ne. Er ernennt die zur Durchführung der Aktivitäten notwendigen Personen wie theologisch kompetente Personen zur Vermittlung des islamischen Wissens und Delegierte bei Organisationen mit ähnlichen Zielen.\nf. Der Präsident vertritt die Interessen des Vereins "Percikan Iman" nach aussen. Vorstandsmitglieder haben Kollektivunterschrift zu zweien, wobei eine dieser Unterschriften entweder vom Präsidenten oder von einem Vizepräsidenten stammen muss. Im Falle der Verhinderung sowohl des Präsidenten als auch der Vizepräsidenten ist eine schriftliche Vollmacht erforderlich, die es einem anderen Vorstandsmitglied ermöglicht, in ihrem Namen zu unterschreiben. Diese Vollmacht muss vom Präsidenten oder vom Vizepräsidenten im Voraus erteilt werden.',
      },
      {
        label: 'XIII. Einberufung von Sitzungen',
        text: 'Der Vorstand versammelt sich auf Einladung des Präsidenten oder auf Wunsch von mindestens zwei Vorstandsmitgliedern.',
      },
      {
        label: 'XIV. Beschlussfassung auf Distanz',
        text: 'Beschlüsse des Vorstandes können auch auf schriftlichem oder telefonischem Weg gefasst werden. Solche Beschlüsse bedürfen der einfachen Mehrheit. Jedes Vorstandsmitglied hat das Recht, eine Sitzung zu verlangen, um den Beschluss persönlich zu besprechen und abzustimmen. Alle gefassten Beschlüsse werden protokolliert.',
      },
      {
        label: 'XV. Protokollführung',
        text: 'Der Vorstand sowie allfällige Kommissionen führen ein Protokoll.',
      },
      {
        label: 'XVI. Ehrenamtlichkeit & Spesen',
        text: 'Die Vorstandsmitglieder arbeiten ehrenamtlich. Sie haben grundsätzlich nur Anspruch auf Entschädigung ihrer effektiven Spesen und Barauslagen. Für besondere Leistungen einzelner Vorstandsmitglieder kann eine angemessene Entschädigung ausgerichtet werden.',
      },
    ],
  },
  {
    number: 10,
    title: 'Revisionsstelle',
    zgbReference: 'Art. 69b ZGB',
    content: [
      'I. Die Revisoren (mindestens zwei Personen) sind Mitglieder, die aus der Mitte der Vereinsversammlung oder von aussen kommen können.',
      'II. Die Revisoren dürfen nicht dem Vorstand des Vereins "Percikan Iman" angehören.',
      'III. Sie haben folgende Pflichten zu erfüllen:',
    ],
    subsections: [
      {
        label: 'a.',
        text: 'Kontrolle der gesamten wirtschaftlichen Aktivitäten anhand von Belegen, Rechnungen und weiteren Dokumenten.',
      },
      {
        label: 'b.',
        text: 'Kontrolle, ob das Vereinsvermögen den Statuten entsprechend verwendet und verwaltet wird.',
      },
      {
        label: 'c.',
        text: 'Sie legen der Vereinsversammlung einen Prüf- und Kontrollbericht vor.',
      },
    ],
  },
  {
    number: 11,
    title: 'Statutenänderungen / Liquidation',
    zgbReference: 'Art. 60 ff., Art. 76 ff. ZGB',
    content: [
      'I. Statutenänderungen und Anträge auf die Auflösung des Vereins müssen zwingend bei der Einladung zur Vereinsversammlung in den Traktanden aufgeführt werden. Die Einladung muss mindestens einen Monat vor der Versammlung erfolgen.',
      'II. Statutenänderungen können grundsätzlich mit einem einfachen Mehr beschlossen werden. Beinhalten sie eine grundlegende Änderung des Zwecks wird eine Zweidrittelmehrheit vorausgesetzt.',
      'III. Der Verein kann nur mit einer Zweidrittelmehrheit aller Mitglieder aufgelöst werden.',
      'IV. Die nach Auflösung des Vereins verbleibenden Mittel sind einer steuerbefreiten Institution, mit Sitz in der Schweiz, mit gleicher oder ähnlicher Zwecksetzung zuzuwenden. Eine Verteilung unter die Mitglieder ist ausgeschlossen.',
    ],
  },
  {
    number: 12,
    title: 'Allgemeines',
    zgbReference: 'Art. 60–79 ZGB',
    content: [
      'I. Als Vereinsjahr wird bis auf weiteres das Kalenderjahr festgelegt.',
      'II. Falls die Statuten des Vereins "Percikan Iman" in andere Sprachen übersetzt werden, gilt bei Unstimmigkeiten zwischen den einzelnen Versionen immer die deutsche Version.',
    ],
  },
];
