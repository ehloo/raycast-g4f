import useGPT from "./api/gpt";

export default function MySelectedTranslate(props) {
    return useGPT(props, {
        showFormText: "Prompt",
        useSelected: true,
        processPrompt: ({ query }) => {
            let prompt = `下面我让你来充当翻译家，你的目标是把任何语言翻译成中文，请翻译时不要带翻译腔，而是要翻译的自然、流畅和地道，使用优美和高雅的表达方式。你只需要翻译即可，请不要产生不必要的解释分析，也不要对我问任何问题，你只管翻译即可，不要进行任何其他交互。请输出翻译结果，然后再输出原文。请翻译下面这句话：` +
                `${query}`;
            let isWord = IsWord("zh", query);
            if (isWord) {
                // prompt = `你是一个专业的英汉/汉英词典引擎，有着媲美牛津词典的效果，请你将给定的英文单词翻译为汉语，只需要翻译不需要解释，也不要对我提问。返回的内容包含美式音标、单词词性及各词性的含义，并且>提供3个英中对照的例句。你应该清楚常见词典软件的格式，请必须按照格式：\n<单词> <美式音标>\n<词性英文简写>. <汉语释义>\n<其他词性>. <汉语释义>\n1. <例句1> <例句汉语翻译>\n2. <例句2> <例句汉语翻译>\n3. <例句3> <例句汉语翻译>。请翻译下面这个单词：` +
                //     `${query}`;
                prompt = `你是一个专业的多国语言词典引擎，有着媲美牛津词典的效果，请你将给定的其他语言单词翻译为汉语，只需要翻译不需要解释，也不要对我提问。返回的内容包含音标、单词词性及各词性的含义，并且>提供3个对照的例句。你应该清楚常见词典软件的格式，请必须按照格式：\n<单词> <音标>\n<词性英文简写>. <汉语释义>\n<其他词性>. <汉语释义>\n1. <例句1> <例句汉语翻译>\n2. <例句2> <例句汉语翻译>\n3. <例句3> <例句汉语翻译>。请翻译下面这个单词：` +
                    `${query}`;
            }
            return (
                prompt
            );
        },
    });
}

function IsWord(lang, text) {
    text = text.trim();
    console.log(lang, "=>", text);
    // eslint-disable-next-line no-undef
    const Segmenter = Intl.Segmenter;
    if (!Segmenter) {
        return false;
    }
    const segmenter = new Segmenter(lang, { granularity: "word" });
    const iterator = segmenter.segment(text)[Symbol.iterator]();
    return iterator.next().value.segment === text;
}


