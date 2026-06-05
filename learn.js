const conceptContent = {
  folding: {
    kicker: "Structure",
    title: "Folding controls whether the mRNA message is stable and readable.",
    body: "mRNA is a long, flexible strand. Parts of the strand can pair with other parts, creating hairpins and loops. Those shapes affect how easily the molecule degrades, how ribosomes read it, and whether it produces the intended antigen efficiently.",
    note: "The console's folding arcs are a simplified representation of secondary-structure prediction, not a full atomic model.",
    meter: "82%"
  },
  quantum: {
    kicker: "Search",
    title: "Quantum methods are useful when the search space becomes painfully large.",
    body: "A short RNA sequence can already have many possible fold patterns. Quantum-compatible optimization methods such as QUBO, Ising models, VQA, VQE, and CVaR filtering are ways to sample difficult combinations rather than checking every option one by one.",
    note: "Current research shows feasibility on limited sequence lengths. It does not mean quantum computers have solved full vaccine design.",
    meter: "68%"
  },
  antigen: {
    kicker: "Immunity",
    title: "The immune system recognizes surfaces, not just letter sequences.",
    body: "An antigen must fold into a shape that exposes the right immune-recognition regions. Some important epitopes are conformational: they exist only when distant parts of a protein come together in 3D space.",
    note: "The molecular viewer represents exposure and binding confidence as decision-support signals that still require lab confirmation.",
    meter: "76%"
  },
  savings: {
    kicker: "Operations",
    title: "Savings come from triage, not from skipping science.",
    body: "The expensive mistake is sending too many weak candidates into validation. Better computation can reduce wasted experiments by ranking candidates earlier and focusing lab capacity on designs with stronger predicted stability and antigen confirmation.",
    note: "The cost and time outputs are scenario estimates controlled by the assumptions in the simulator.",
    meter: "61%"
  }
};

const buttons = document.querySelectorAll(".concept-button");
const kicker = document.getElementById("conceptKicker");
const title = document.getElementById("conceptTitle");
const body = document.getElementById("conceptBody");
const note = document.getElementById("conceptNote");
const meter = document.getElementById("conceptMeter");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const content = conceptContent[button.dataset.concept];
    buttons.forEach((item) => item.classList.toggle("active", item === button));
    kicker.textContent = content.kicker;
    title.textContent = content.title;
    body.textContent = content.body;
    note.textContent = content.note;
    meter.style.width = content.meter;
  });
});

meter.style.width = conceptContent.folding.meter;
