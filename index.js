import "@logseq/libs";

const settingsTemplate = [

  {
    key: "randomMode",
    type: "enum",
    default: "page",
    title: "Random Mode",
    description: "Page, card, tags or advanced query",
    enumChoices: ["page", "card", "tags", "query", "naext"],
    enumPicker: "radio",
  },
  {
    key: "includeJournals",
    type: "boolean",
    default: false,
    title: "Page mode",
    description: "Include Journals?",
  },
  {
    key: "randomTags", /** I have been using that as a placeholder  */
    type: "string",
    default: "",
    title: "Tags mode",
    description: "Comma separated the tags. e.g. programing,design,sports",
  }, 
  {
    key: "advancedQuery", /** This is cool, keep it  */
    type: "string",
    default: "",
    title: "Query mode",
    description:
      'Your custom query. e.g. [:find (pull ?b [*]) :where [?b :block/refs ?bp] [?bp :block/name "book"]]',
  },  
  {
    key: "randomStepSize", /** what is this actually doing?  */
    type: 'enum',
    default: "1",
    title: "Random walk step size.",
    description: "Random walk step size. Use it with caution. One shows in main area, others show in the right sidebar.",
    enumChoices: ["1", "3", "5", "7", "10"],
    enumPicker: 'radio' 
  }
];

logseq.useSettingsSchema(settingsTemplate);

async function openRandomNote() {
  const queryScript = getQueryScript();
  const naextOne = (logseq.settings.randomMode == "naext") ? true : false;
  let stepSize = parseInt(logseq.settings.randomStepSize || 1);
  if (!naextOne) {
    try {
      let ret = await logseq.DB.datascriptQuery(queryScript[0]);
      const pages = ret?.flat();
      console.log(pages);
      for (let i = 0; i < pages.length; i++) {
        const block = pages[i];
        if (
          block.parent && block.page &&
          block.parent?.id === block.page?.id &&
          (await logseq.Editor.getPreviousSiblingBlock(block.uuid)) == null
        ) {
          pages[i] = await logseq.Editor.getPage(block.page.id);
        }
      }
      openRandomNoteInMain(pages, queryScript[1], naextOne);
      if (stepSize > 1) {
        openRandomNoteInSidebar(pages, stepSize - 1);
      }
    } catch (err) {
      logseq.App.showMsg(
        err.message || "Maybe something wrong with the query",
        "error"
      );
      console.log(err);
    }
  }
  else if (naextOne) {
    try {
      const prepages = [];
      const ressonances = []
      for (let j = 0; j < 101; j=j+10) {
        let query = `
        [:find (pull ?b [*])
          :where
          [?b :block/refs ?bp]
          [?bp :block/name ?name]
          [(contains? #{"` +
          j +
          `"} ?name)]]`;
        let ret = await logseq.DB.datascriptQuery(query);
        prepages.push(ret?.flat());
        ret.forEach(element => ressonances.push(j));
      }
      const pages = prepages?.flat();
      for (let i = 0; i < pages.length; i++) {
        const block = pages[i];
        if (
          block.parent && block.page &&
          block.parent?.id === block.page?.id &&
          (await logseq.Editor.getPreviousSiblingBlock(block.uuid)) == null
        ) {
          pages[i] = await logseq.Editor.getPage(block.page.id);
        }
      }
      openRandomNoteInMain(pages, ressonances, true);
      if (stepSize > 1) {
        openRandomNoteInSidebar(pages, stepSize - 1);
      }
    } catch (err) {
      logseq.App.showMsg(
        err.message || "Maybe something wrong with the query",
        "error"
      );
      console.log(err);
    }
  }
}

/**
 * open random note in main area.
 * @param {*} pages
 */
async function openRandomNoteInMain(pages, ressonance, naext) { /* So essentially what I want is a function that returns all pages + a chance. No. I just want a skewed function */
  if (pages && pages.length > 0 && !naext) {
    const index = Math.floor(Math.random() * pages.length); /* this is where the uniform math happens */
    const page = pages[index];
    if (page && page.name) {
      logseq.App.pushState("page", { name: page.name });
    } else if (page && page.page) {
      const blockInfo = (await logseq.Editor.getBlock(page.id)) || {
        uuid: "",
      };
      logseq.App.pushState("page", { name: blockInfo.uuid });
    }
  }
  else if (pages && pages.length > 0 && naext) {
    /*const beta = Math.pow(Math.sin(Math.random()*Math.PI/2), 2);
    console.log(Math.random()*Math.PI/2);
    console.log(Math.sin(Math.random()*Math.PI/2));
    const index = (beta < 0.5) ? 2*beta : 2*(1-beta);
    console.log("Ressonance is " + ressonance);
    const flooredIndex = Math.floor(index * pages.length);*/
    const totalSumSq = ressonance.reduce((partialSum, a) => partialSum + Math.pow(a, 2), 0);
    console.log(totalSumSq);
    const probabilities = ressonance.forEach(element => probabilities.push(Math.pow(element, 2)/totalSumSq));
    const cumulativeSum = (sum => value => sum += value)(0);
    const cumProbs = probabilities.map(cumulativeSum);
    const found = cumProbs.some(function(el) {
      console.log(el)
      return el > Math.random();
    });
    const rand = Math.random();
    for (let k = 0; k < cumProbs.length; k++) {
      if (cumProbs[k] > rand) {
        const found = k;
        break;
      };
    }
    const page = pages[found];
    if (page && page.name) {
      logseq.App.pushState("page", { name: page.name });
    } else if (page && page.page) {
      const blockInfo = (await logseq.Editor.getBlock(page.id)) || {
        uuid: "",
      };
      logseq.App.pushState("page", { name: blockInfo.uuid });
    }
  }
}

/**
 * open random notes in right sidebar.
 * @param {*} pages
 * @param {*} counts
 */
async function openRandomNoteInSidebar(pages, counts) {
  for(var i = 0; i < counts; i++) {
    const index = Math.floor(Math.random() * pages.length);
    const page = pages[index];
    logseq.Editor.openInRightSidebar(page.uuid)
  }
}

function getQueryScript() {
  const randomMode = logseq.settings.randomMode;
  const includeJournals = logseq.settings.includeJournals;
  const randomTags = logseq.settings.randomTags.split(",");
  const defaultQuery = [`
  [:find (pull ?p [*])
    :where
    [_ :block/page ?p]]`, "default"];
  switch (randomMode) {
    case "page":
      if (includeJournals) {
        return [`
        [:find (pull ?p [*])
          :where
          [_ :block/page ?p]]`, "page"];
      } else {
        return [`
        [:find (pull ?p [*])
          :where
          [_ :block/page ?p]
          [?p :block/journal? false]]`, "page"];
      }
    case "tags":
      const tags = randomTags.map((item) => '"' + item.toLowerCase() + '"').join(",");
      if (!logseq.settings.randomTags) {
        logseq.App.showMsg("Random tags are required.", "warning");
      }
      return (
        [`
      [:find (pull ?b [*])
        :where
        [?b :block/refs ?bp]
        [?bp :block/name ?name]
        [(contains? #{` +
        tags +
        `} ?name)]]
      `, "tags"]
      );
    case "card":
      return (
      [`
      [:find (pull ?b [*])
        :where
        [?b :block/refs ?bp]
        [?bp :block/name ?name]
        [(contains? #{"card"} ?name)]]
      `, "card"]
      );
    case "naext":
      return (
      [`
      [:find (pull ?b [*])
        :where
        [?b :block/refs ?bp]
        [?bp :block/name ?name]
        [(contains? #{"90","80","70","60"} ?name)]]
      `, "naext"]
      );
    case "query":
      return logseq.settings.advancedQuery;
    default:
      console.log("unknown");
      return defaultQuery;
  }
}

function main() {
  console.log("Reloaded 2")
  logseq.provideModel({
    handleRandomNote() {
      openRandomNote();
    },
  });

  logseq.App.registerUIItem("toolbar", {
    key: "logseq-naext-one-toolbar",
    template: `
      <span class="logseq-naext-one-toolbar">
        <a title="I'm Feeling Lucky(r n)" class="button" data-on-click="handleRandomNote">
          <i class="ti ti-windmill"></i>
        </a>
      </span>
    `,
  });

/*   logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note",
      label: "Random note => Let's go",
      keybinding: {
        mode: "non-editing",
        binding: "r n",
      },
    },
    () => {
      openRandomNote();
    }
  );

  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:page-mode",
      label: "Random note => page mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "page" });
    }
  );
  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:tags-mode",
      label: "Random note => tags mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "tags" });
    }
  );
  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:card-mode",
      label: "Random note => card mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "card" });
    }
  );
  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:query-mode",
      label: "Random note => query mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "query" });
    }
  ); */
}

logseq.ready(main).catch(console.error);