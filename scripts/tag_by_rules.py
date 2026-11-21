"""First-pass keyword tagging of data/papers.json from titles and journal names.

Records imported from the CV have no abstracts, so this pass uses simple title rules. It only fills records whose tags
are empty or were written by this script (tag_source == "rules"); hand edits and LLM tags are left alone.
"""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
P = ROOT / "data" / "papers.json"
TOPIC = {
 "psychopathy": r"psychopath|callous|pcl|unemotional|lsrp",
 "youth": r"adolescen|youth|juvenile|child(?!hood)|conduct disorder|boys|girls|teen|young offender",
 "women": r"\bwom[ae]n|female|sex differences|gender",
 "antisocial_violence": r"antisocial|violen|homicid|murder|aggress|crimin|offend|externaliz|incarcerat|inmate|prison|forensic|delinquen",
 "risk_prediction": r"predict|recidiv|re-?arrest|rearrest|reoffen|risk assess|risk outcome|mortality|neuroprediction|outcome",
 "moral_emotion": r"moral|empath|emoti|affect|fear|disgust|distress|facial|faces|punish|harm|dishonest|lying|decept|guilt|perspective-taking|religio",
 "cognitive_control": r"oddball|target|novel|inhibit|go/?\s?no-?go|error|attention|executive|impuls|working memory|language|semantic|word|lexical|phonolog|monitoring|p3|salien|reward|decision",
 "substance_use": r"substance|alcohol|cocaine|stimulant|cannabis|marijuana|heroin|opioid|addict|drug|craving|smok|nicotine|methamphetamine|relapse",
 "psychosis": r"schizophren|psychosis|psychotic|bipolar|hallucinat|thought disorder",
 "other_clinical": r"obsessive|hoard|anxiety|adhd|attention-deficit|depress|ptsd|posttraumatic|autis|borderline|suicid|tourette|alzheimer",
 "tbi": r"traumatic brain injury|\btbi\b|concuss|head injur",
 "trauma_adversity": r"childhood trauma|maltreat|(?<!substance )(?<!drug )(?<!alcohol )abuse|advers|neglect|trauma(?!tic brain)",
 "sexual_offending": r"sex offen|sexual sadis|paraphil|pedophil|sexual(ly)? (violen|offen|abus)|rape",
 "law_ethics": r"\blaw\b|legal|court|sentenc|judge|jur(y|or)\b|capital|death penalty|responsib|neurolaw|ethic|policy|evidence in|culpab|punishment judg",
 "healthy_cognition": r"killer whale|healthy|normal|aging|ageing|age-related|handedness|developmental",
}
APPROACH = {
 "fmri": r"fmri|functional magnetic|hemodynamic|neural (response|correlat|activ|mechanism|system|pathway|circuit)|brain (response|activ)|engagement of|activation|bold",
 "structural_mri": r"gr[ae]y matter|volume|morphomet|cortical thick|thinning|structur|brain age|cavum|corpus callosum|\bvbm\b|\bsbm\b",
 "connectivity": r"connectivity|independent component|\bica\b|network|resting|default mode|coupling|dynamic|fusion",
 "dti": r"diffusion|white matter|uncinate|fasciculus|tract",
 "eeg_erp": r"event-related potential|\berps?\b|\beeg\b|brain potential|p3\b|p300|n400|error-related negativity|\bern\b|electrophysiolog|\bmeg\b|magnetoencephal|brainstem response|oscillat",
 "genetics": r"genet|genom|gene\b|polymorphism|snp|hormon|cortisol|testosterone|oxytocin|heritab|skin conductance|heart rate|physiolog",
 "machine_learning": r"machine learning|classif|predict(?:s|ion|ing|ive)? (?:of |future |re)|multivariate pattern|support vector|deep learning|neuroprediction|pattern",
 "assessment": r"scale|checklist|factor structure|psychometric|validat|reliab|assessment|self-report|inventory|measurement|item response|latent",
 "treatment": r"treatment|intervention|therapy|remediation|mindfulness|training|randomi[sz]ed|medicat|olanzapine|clinical trial",
 "methods_tools": r"method|software|toolbox|technique|protocol|algorithm|multi-?site|mobile|approach for|framework|pipeline|removal|correction|comparison of .*sequences|atlas",
}
IMAGING = {"fmri", "structural_mri", "connectivity", "dti", "eeg_erp"}

def tag(r):
    t = (r["title"] + " " + (r.get("journal") or "")).lower()
    tt = r["title"].lower()
    topic = [k for k, p in TOPIC.items() if re.search(p, tt if k in ("law_ethics", "healthy_cognition") else t)]
    appr = [k for k, p in APPROACH.items() if re.search(p, tt)]
    if not appr or not (set(appr) & IMAGING or set(appr) & {"genetics", "treatment", "assessment"}):
        if "law_ethics" not in topic and re.search(r"brain|neural|cortex|cortical|amygdala|limbic|striat|temporal|frontal|cingulate", t) and not set(appr) & IMAGING:
            appr.append("fmri" if re.search(r"neural|respon|processing|during|task|signal|regulation|engagement", t) else "structural_mri")
        elif not appr or appr == ["machine_learning"]:
            appr.append("behavior")
    if not topic:
        topic.append("healthy_cognition")
    if "healthy_cognition" in topic and len(topic) > 2:
        topic.remove("healthy_cognition")
    kind = r.get("kind")
    if kind == "book": ty = "book"
    elif kind == "chapter": ty = "chapter"
    elif kind == "retraction" or re.search(r"\bcommentary\b|\breply\b|\bresponse to\b|comment on|retraction|erratum|corrigendum", t): ty = "commentary"
    elif re.search(r"review|meta-analy|perspective|scholarpedia|overview|primer|past, present|theor|model of|hypothesis\b", t) or kind == "article" and re.search(r"trends in|current opinion|annual review|nature reviews|jurimetrics", t): ty = "review"
    elif "methods_tools" in appr and not topic[:1] == ["psychopathy"] and re.search(r"method|software|toolbox|algorithm|technique|approach for|framework", t): ty = "methods"
    else: ty = "empirical"
    if ty in ("review", "chapter", "book", "commentary") and appr == ["behavior"]:
        appr = []
    return {"topic": topic[:5], "approach": appr[:4], "type": [ty]}

recs = json.load(open(P)); n = 0
for r in recs:
    if not r.get("tags") or r.get("tag_source") == "rules":
        r["tags"] = tag(r); r["tag_source"] = "rules"; n += 1
json.dump(recs, open(P, "w"), ensure_ascii=False, indent=1)
from collections import Counter
for ax in ("topic", "approach", "type"):
    print(ax, Counter(v for r in recs for v in r["tags"].get(ax, [])).most_common())
print("tagged", n, "of", len(recs))
