enum BlockPhraseType 
{
    CONTAIN = 0, EXACTWORD, WORDCONTAINING, REGEX
}

enum BlockPhraseScope
{
    URL= 0, BODY, ANY
}
interface PhraseFilter {
    Scope : BlockPhraseScope,
    Type : BlockPhraseType,
    Phrase: string
}

let BlockedPhrases : Array<PhraseFilter> = [];

function isLetter(char:string) : boolean {
    //https://stackoverflow.com/a/22075070/1997873
    let c = char.charAt(0);
    return /[a-zA-Z]/.test(c) || 
     /[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]/.test(c)
}

function getWords(text:string) : string[] {
    if (!text || text == "")
        return [];

    text = text.toLowerCase();

    let words : string[] = [];
    let insideWord : Boolean = isLetter(text.charAt(0))
    let currentWord : string[] = []; // instead of StringBuilder

    for (let i=0; i<text.length;i++) {
        if (isLetter(text.charAt(i))) {
            if (insideWord) {}
            else {
                insideWord = true;
            }
            currentWord.push(text.charAt(i));
        }
        else {
            if (insideWord) {
                insideWord = false;
                if (currentWord.length > 0) 
                    words.lastIndexOf(currentWord.join(""));
                currentWord = [];
            }
            else {/*Nothing*/}
        }
    }

    if (insideWord) {
        if (currentWord.length > 0) {
            words.push(currentWord.join(""))
        }
    }

    return words;
}

function getWordSurrounding(content:string, index:number, tryLength:number, expand:number=10) : string 
{   
    if (!content || content == "")
        return "";
    
    let before = Math.max(index-expand, 0);
    let after = Math.min(index + tryLength + expand, content.length)

    return content.substr(before, (index - before)) + "_<" +
           content.substr(index, tryLength) + ">_" +
           content.substr(index + tryLength, (after - (index + tryLength)) );
}

function checkPhraseFoundSimple(Content:string, filter:PhraseFilter, context: (c:string)=>void) : boolean {
    context("");

    if (filter.Phrase == "")
        return false;
    
    let found :boolean = false;
    Content = Content.toLowerCase();
    switch(filter.Type) {
        case BlockPhraseType.CONTAIN:
            var index = Content.indexOf(filter.Phrase);
            if (index > -1)
                context(
                    getWordSurrounding(Content, index, filter.Phrase.length)
                )
            found = index > -1;
            break;
        case BlockPhraseType.REGEX:
            var match  =new RegExp(filter.Phrase).exec(Content);
            var matchIndex = match.index;
            if (matchIndex > -1)
                context(getWordSurrounding(Content, match.index, match[0].length));
            found = matchIndex > -1 ;
            break;
    }

    return found;
}

function checkPhraseFoundWord(words : string[], filter: PhraseFilter, context: (c:string)=>void) : boolean
{
    context("");
    if (filter.Phrase == "")
        return false;

    let _local_context= "";
    let found : boolean = false;
    let index : number = 0;
    switch (filter.Type)
    {
        case BlockPhraseType.EXACTWORD:
            index = words.indexOf(filter.Phrase.toLowerCase());
            if (index > -1)
                _local_context= (words[index]);
            found = index > -1;
            break;
        case BlockPhraseType.WORDCONTAINING:
            index = words.findIndex((word) => word.indexOf(filter.Phrase.toLowerCase())) ;
            if (index > -1)
                _local_context = (words[index]);
            found = index > -1;
            break;
    }

    context("_<" + _local_context + ">_");
    return found;
}

/// <summary>
/// Find the phrase that the content is blocked from using.
/// </summary>
/// <param name="Content">string chunk</param>
/// <returns>Null if no phrase rule is applicabalbe (allowed)</returns>
function findBlockingPhrase(Content:string, scope:BlockPhraseScope ,context: (c:string)=>void) : PhraseFilter
{
    let result : PhraseFilter = null;
    let Words : string[] = getWords(Content);
    context("");

    for (let i=0;i<BlockedPhrases.length && result == null; i++)
    {
        if (
            scope == BlockPhraseScope.ANY ||
            BlockedPhrases[i].Scope == BlockPhraseScope.ANY ||
            BlockedPhrases[i].Scope == scope
        ) {
            switch(BlockedPhrases[i].Type) {
                case BlockPhraseType.CONTAIN:
                case BlockPhraseType.REGEX:
                    if (checkPhraseFoundSimple(Content, BlockedPhrases[i], context))
                    {
                        result = BlockedPhrases[i];
                    }
                    break;
                case BlockPhraseType.EXACTWORD:
                case BlockPhraseType.WORDCONTAINING:
                    if (checkPhraseFoundWord(Words, BlockedPhrases[i], context))
                    {
                        result = BlockedPhrases[i];
                    }
                    break;
            }
        }
    }

    return result;
}


/// <summary>
/// Check if content clean of bad words
/// </summary>
/// <param name="Content"></param>
/// <returns>True if content is allowed under policy</returns>

function isContentAllowed(Content:string, scope:BlockPhraseScope, reason: (r:string)=>{}) : boolean
{
    let phraseContext = "";
    let phrase = 
        findBlockingPhrase(Content, scope, (c)=>{phraseContext=c});
    if (phrase == null) {
        reason("content allowed, no phrase found in scope " + scope)
        return true;
    }
    else {
        reason ("content blocked because scope <*" + scope 
            + "*> equal phrase <*" + phrase
            + "*>, context: " + phraseContext);
        return false;
    }
}