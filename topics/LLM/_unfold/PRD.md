# Large Language Models: lesson PRD

- **Slug:** llm
- **Folder:** LLM
- **Duration:** 30m
- **Level:** intermediate
- **Domain:** ai-ml
- **Summary:** How a decoder-only transformer turns your text into tokens, mixes them with causal self-attention, and picks the next token from a probability distribution, one token at a time.
- **Player version:** 1.0.0

## 1. Learner profile
- Why: preparing for an interview or exam; needs crisp, correct explanations with the right shapes and numbers.
- Starting point: knows the words (tokens, transformer, attention) but not how they fit together.
- Solid: next-token prediction (output is a distribution over the vocabulary), causal masking (-inf → weight 0), why scale by sqrt(d_k), KV cache (past K and V only; valid because of the mask).
- Shaky: self-attention (gets the scoring and the N x N shape, but not that the weights blend the **value** vectors into a new vector per token), LM head and softmax (doesn't treat softmax as a function of logits that decoding reshapes).
- Unknown: decoding (temperature, top-k, top-p); not tested so treated as unknown: tokenization, embeddings, positional information, multi-head, transformer block / residual stream, training objective, autoregressive loop, context window.
- Misconceptions detected: "temperature changes the sampling, not the probabilities" (said p stays 0.44 at tau 0.1); explained attention as looking at "surrounding" tokens (the bidirectional picture), despite answering the masking question correctly.
- Pitch: intermediate and interview-oriented. Move fast through the mask, sqrt(d_k) and the KV cache (one-liners plus numbers). Dwell on (a) attention's *output*, a softmax-weighted sum of V giving each token a new context-aware vector built only from itself and earlier tokens, and (b) logits → softmax → temperature/top-k/top-p with real numbers. Show the whole pipeline end to end once, since the early stages weren't tested. Use shapes ([N x d], [N x N], [1 x |V|]) everywhere; interviewers ask for them.

## 2. Learning objectives
1. **Trace** one forward pass of a decoder-only LLM from raw text to a sampled next token, naming the shape of the data at each stage.
2. **Explain** in one sentence what self-attention outputs for a token (softmax(QK^T/sqrt(d_k)) weights over **earlier** tokens, blending their value vectors) and why the causal mask uses -inf.
3. **Predict** how temperature, top-k and top-p change the next-token distribution, using the logits [1.2, 0.9, 0.1, -0.5].
4. **Explain** why the KV cache is valid and what it costs (memory that grows linearly with sequence length).
5. **Distinguish** what attention does (mixes across positions) from what the FFN does (per position), and what changes at training vs inference time.

## 3. Tabs

### 3.1 ELI5 (`eli5`, kind `stepper`, icon `lightbulb`)

One analogy carried through: the **filing cabinet** (research §3, analogy 1) for attention, with autocomplete as the hook and the whiteboard naming the residual stream at the end.

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows (state) |
|---|---|---|---|---|---|---|
| 1 | Autocomplete, but huge | An LLM's only job: given the words so far, score every possible next piece, pick one, repeat. Hook only; flag that it re-reads everything each time. | S1 | `eli5-cabinet` | svg | sentence "The cat sat on the" with a blank chip at the end; a fan of candidate chips (mat, floor, sofa…) with bars |
| 2 | Each word asks a question | The newest word writes a sticky note ("what am I sitting on?"); every earlier word wears a folder label. Matching labels get higher scores. | S9 | `eli5-cabinet` | svg | sticky note above the last word; label tags on earlier words; match-strength lines |
| 3 | Take a blend, not one folder | You don't pick one folder: you take a mix of all folder contents, more from better matches. And you may only open folders filed *before* you. | S9, S3 | `eli5-cabinet` | svg | folder contents flowing into the last word, thickness = weight; later positions greyed out with a lock |
| 4 | The real names | Sticky note = **query**, label = **key**, contents = **value**; the "only earlier folders" rule = **causal mask**; each word's notebook that layers keep adding to = **residual stream**. | S3, S4 | `eli5-cabinet` | svg | same picture with the real labels Q, K, V, mask, residual stream overlaid |

- Callouts: step 3, warning: "Where it breaks: it's a soft mix of *all* earlier folders, never just one." Step 4, insight: "Interview line: attention lets each token pull in information from earlier tokens, weighted by relevance."
- Code / formula: none.

### 3.2 Core Mechanism (`core`, kind `stepper`, icon `brain-circuit`)

One main scene, `llm-pipeline`: a left-to-right pipeline (text → tokens → embeddings + position → L stacked blocks → LM head → distribution → sampled token → appended back). Each step lights one stage. Running example: prompt "The cat sat on the" → next token.

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows (state) |
|---|---|---|---|---|---|---|
| 1 | Text becomes tokens | BPE splits text into subword tokens from a fixed vocabulary; each becomes an integer id. GPT-2: byte-level BPE, 50,257 tokens, no unknown token. | S2, S1 | `llm-pipeline` | svg | stage "tokens" lit: text splits into 5 chips with ids (illustrative ids, labelled "example ids") |
| 2 | Ids become vectors | Each id selects a row of E [|V| x d]; stacked rows give X [N x d]. | S3 | `llm-pipeline` | svg | stage "embed": chips drop into rows of a tall table; X [5 x d] shape badge |
| 3 | Add position | Attention ignores order on its own, so position is injected: added vectors (sinusoidal/learned) or RoPE rotating Q and K. | S3, S4, S7 | `llm-pipeline` | svg | stage "position": a "+pos" bar on each row; small rotation glyph labelled RoPE |
| 4 | Attention: score earlier tokens | The last token's query is dotted with keys of itself and earlier tokens, scaled by sqrt(d_k), masked so future cells are -inf. QK^T is [N x N]. | S4, S3 | `llm-pipeline` | svg | stage "block" opened: N x N grid, upper triangle dark with -inf; last row highlighted |
| 5 | Attention: blend the values | Softmax turns the row into weights summing to 1; the output is the weighted sum of value vectors: a new vector for this token that carries context. This is the step people forget. | S4, S3 | `llm-pipeline` | svg | last row's weights as bars; value vectors flowing into the last token lane with thickness = weight; output vector glows |
| 6 | Many heads, then the FFN, then repeat | h heads do this in parallel on d/h slices, concatenated and projected; then a position-wise FFN; each adds into the residual stream; stack L times. Only attention moves info between positions. | S4, S3, S8 | `llm-pipeline` | svg | head slices in colours, "+" into residual lane, FFN box per lane, "x L" stack indicator (LLaMA-7B: 32 layers, 32 heads, d 4096) |
| 7 | One score per vocab token | The last position's vector [1 x d] times E^T gives |V| logits; softmax → probability distribution. The model outputs a distribution, not a word. | S3 | `llm-pipeline` | svg | stage "head": logit bars for a few labelled tokens and "… 50,257 total"; softmax arrow to probability bars |
| 8 | Pick, append, repeat | A decoding rule picks a token; it is appended and the model runs again. The KV cache keeps past K and V per layer so only the new token's q, k, v are computed. | S5, S6, S9 | `llm-pipeline` | svg | sampled chip "mat" moves back to the input end; K/V card stacks grow by one |
| 9 | Edge case: the window fills | The context window is a hard limit (GPT-2: 1024 tokens); the KV cache grows linearly with length, so long contexts cost memory. | S1, S6 | `llm-pipeline` | svg | input row full at the limit marker; KV stacks tall with a memory gauge in the red |

- Callouts: step 5, insight: "Interview line: attention output = softmax(QK^T/√d_k)·V, a relevance-weighted blend of earlier tokens' values." Step 4, good-to-know: "Training uses the same mask: every position predicts its next token in one pass (teacher forcing) [S3]." Step 7, warning: "No weights change at inference: generation is a forward pass only [S3]."
- whatChanged and metrics: steps 2-7 show a `shape` metric (e.g. `X: [5 x d]`, `QK^T: [5 x 5]`, `logits: [1 x 50,257]`).
- Code / formula: step 4 formula `scores = QKᵀ / √d_k + M`; step 5 formula `Attention(Q,K,V) = softmax(QKᵀ/√d_k + M) V`; step 7 formula `y = softmax(h Eᵀ)`.

### 3.3 Technical (`technical`, kind `stepper`, icon `math-formula`)

Precise and cited, aimed at the shaky/unknown concepts. Tab code: a ~16-line Python/NumPy-style pseudocode of one decode step (`lang: "py"`, title "One decode step (pseudocode)"):

```
def decode_step(x_new, cache, tau=1.0, top_p=0.9):
    h = embed(x_new) + pos(len(cache))          # [1 x d]
    for layer in layers:
        a = layer.norm1(h)
        q, k, v = a @ Wq, a @ Wk, a @ Wv        # new token only
        cache[layer].append(k, v)               # KV cache
        K, V = cache[layer].keys, cache[layer].values
        w = softmax(q @ K.T / sqrt(d_k))        # past + self only
        h = h + (w @ V) @ Wo                    # residual add
        h = h + ffn(layer.norm2(h))             # position-wise
    logits = final_norm(h) @ E.T                # [1 x |V|]
    p = softmax(logits / tau)                   # temperature
    p = keep_nucleus(p, top_p)                  # top-p, renormalise
    return sample(p)
```

(Multi-head splitting is omitted for brevity; say so in a callout.)

| # | Step title | Narration intent | Cite | Scene id | Mode | What the scene shows (state) |
|---|---|---|---|---|---|---|
| 1 | Attention, exactly | Attention(Q,K,V) = softmax(QK^T/√d_k)V; q_i = x_iW^Q, k_j = x_jW^K, v_j = x_jW^V. Highlight lines 5, 8-9. | S4, S3 | `attn-grid` | svg | 5x5 score grid, values shown; a V matrix beside it; output row = weights · V |
| 2 | Why √d_k and why -inf | Dot products have variance d_k, so large d_k saturates softmax and kills gradients; masked cells get -inf (a 0 would still get positive weight). Highlight line 8. | S4, S3 | `attn-grid` | svg | toggle between unscaled (one cell ≈ 1.0, others ≈ 0) and scaled rows; upper triangle -inf → 0 |
| 3 | Heads and sizes | d_model 512, h 8 → d_k 64; MultiHead = Concat(heads)W^O. LLaMA-7B: d 4096, 32 heads, 32 layers. FFN is position-wise, d_ff ≈ 4d (SwiGLU slightly less). Highlight line 10. | S4, S8, S3 | `attn-grid` | svg | the 512-wide vector split into 8 coloured 64-wide slices, each with a mini grid; concat bar |
| 4 | Logits to probabilities | logits u = hE^T, shape [1 x |V|]; y = softmax(u). Training loss = -log p(true next token), with teacher forcing. Highlight lines 11-12. | S3 | `logit-bars` | svg | 4 bars for logits [1.2, 0.9, 0.1, -0.5] → probabilities, top = 0.44 |
| 5 | Temperature reshapes the distribution | softmax(u/τ): τ 0.5 → top 0.59; τ 0.1 → 0.95; τ 100 → ≈0.25 each. τ→0 = greedy. It changes the probabilities, not the model's knowledge. Highlight line 12. | S3, S5 | `logit-bars` | svg | same bars animated across τ = 1, 0.5, 0.1, 100 with values labelled |
| 6 | Top-k vs top-p | Top-k keeps a fixed k; top-p keeps the smallest set with cumulative p ≥ threshold, so its size adapts (HF example: 9 tokens in one case, 3 in another at p 0.92). Renormalise, then sample. Highlight line 13. | S3, S5, S12 | `logit-bars` | svg | sorted bars with a k cutoff line vs a running-sum line crossing p; kept bars renormalised |
| 7 | KV cache: what and why | Cache past K and V per layer, shape [batch, heads, seq_len, head_dim]; valid because the mask means past k, v never change. Per-step cost goes from quadratic to linear; memory grows linearly; GQA shares KV heads to shrink it. Highlight lines 5-7. | S6, S10 | `kv-stack` | svg | per-layer K and V card stacks growing by one per step; the q card is not stored; GQA view merges KV stacks across head groups |
| 8 | "Temperature 0 is deterministic"? | Greedy is deterministic in theory, but servers batch requests and many kernels aren't batch-invariant: 1,000 completions at τ 0 gave 80 unique outputs; batch-invariant kernels gave 1. | S11 | `logit-bars` | svg | τ = 0 single tall bar, then a scatter of 80 distinct output chips vs 1 |

- Callouts: step 1, good-to-know: "Multi-head splitting is omitted from the pseudocode; step 3 adds it." Step 5, warning: "Myth: temperature only changes sampling. It rescales logits, so the probabilities themselves change [S3]." Step 7, insight: "KV memory per token ∝ 2 × layers × KV heads × head_dim (derived from the cache shape [S6])."

### 3.4 Check Yourself (`check`, kind `quiz`, icon `question-circle`)
See §5.

### 3.5 Related & Sources (`related`, kind `related`, icon `document-text`)
See §6 and §8.

## 4. Scenes

- **`eli5-cabinet`** · svg
  - Purpose: attention as a relevance-weighted blend from earlier "folders".
  - Elements: a row of 5 word chips ("The cat sat on the") plus a blank chip; sticky note (query, amber) above the newest word; label tags (keys, blue) on earlier words; folder contents (values, green) as small cards; flow lines whose thickness is the weight; a lock and grey on future positions; candidate fan (mat/floor/sofa) with bars at step 1.
  - State fields: `stage: "hook"|"query"|"blend"|"names"`, `weights: number[5]`, `showLabels: boolean`.
  - Transitions: the sticky note appears; match lines grow; flow lines animate into the newest word; real-term labels fade in.

- **`llm-pipeline`** · svg (main core scene)
  - Purpose: one forward pass plus the generation loop, end to end, with shapes.
  - Elements: left-to-right stages, each a labelled box: Text, Tokens, Embed+Pos, Block ×L (expandable to show the attention grid, head slices, FFN and the residual "+" lane), LM head, Distribution, Sample. A return arrow from Sample back to Tokens. KV card stacks under the block. A shape badge under each stage. Colours: tokens neutral, Q amber, K blue, V green, masked cells dark slate with "-inf", residual lane purple, probabilities teal, memory gauge green → red.
  - State fields: `active: "tokens"|"embed"|"pos"|"attn-score"|"attn-blend"|"block"|"head"|"loop"|"window"`, `tokens: string[]`, `ids: number[]`, `weights: number[]` (last row), `probs: {tok: string, p: number}[]`, `kvLen: number`, `limit: number`, `shape: string`.
  - Transitions: the lit stage moves right one box per step; at attn-score the block expands into the N x N grid and the upper triangle darkens; at attn-blend value arrows flow in with weight-scaled thickness; at loop the sampled chip travels back and the KV stacks grow; at window the input bar hits the limit marker and the gauge turns red.

- **`attn-grid`** · svg
  - Purpose: the exact attention arithmetic: scores, scaling, mask, softmax, value blend, heads.
  - Elements: N x N grid (N = 5) with numeric cells; masked cells dark "-inf"; row-softmax bars; V matrix; output row; optional head-split view of a 512-wide bar into 8 × 64 slices.
  - State fields: `view: "full"|"scale"|"heads"`, `scaled: boolean`, `masked: boolean`, `highlightRow: number`.
  - Transitions: cells fill, then dark-mask, then the row converts to weights; scaled vs unscaled toggles between a peaky and a smooth row; the head split fans out into 8 coloured mini-grids.

- **`logit-bars`** · svg
  - Purpose: logits → softmax → temperature / top-k / top-p, with the textbook numbers.
  - Elements: 4 labelled bars (tokens A-D for logits [1.2, 0.9, 0.1, -0.5]) with value labels; a τ readout; a k cutoff line; a cumulative-sum line with a p threshold; for step 8, output chips (80 distinct vs 1).
  - State fields: `tau: number`, `mode: "logits"|"probs"|"temp"|"topk"|"topp"|"determinism"`, `k: number`, `p: number`. Probabilities are computed in the scene as softmax(logits/τ), so the values must match 0.44 / 0.59 / 0.95 / ≈0.25 [S3].
  - Transitions: bars morph between τ values; cut bars fade and the kept ones renormalise upward.

- **`kv-stack`** · svg
  - Purpose: what the KV cache stores and how it grows.
  - Elements: L = 3 layer rows; each with a K stack (blue) and a V stack (green) of cards, one per token; a single amber q card for the new token that is used then discarded; a memory gauge; GQA view: 8 query heads sharing 2 KV stacks.
  - State fields: `step: number` (tokens so far), `view: "mha"|"gqa"`, `showQ: boolean`.
  - Transitions: each step adds one K and one V card per layer; the q card flashes and fades; the gauge rises linearly; GQA merges stacks.

## 5. Quiz

| # | Concept | Question | Options (A-D) | Answer | Why (cite) |
|---|---|---|---|---|---|
| 1 | decoding-temperature | Logits [1.2, 0.9, 0.1, -0.5] give the top token p = 0.44 at τ = 1. What is it at τ = 0.5? | A: About 0.25 · B: About 0.44 · C: About 0.59 · D: About 0.35 | C | Dividing logits by τ < 1 sharpens softmax: 0.59 at τ 0.5, 0.95 at τ 0.1 [S3]. |
| 2 | self-attention | For one token, what does a self-attention head output? | A: The single most relevant earlier token · B: A weighted sum of value vectors from itself and earlier tokens · C: The attention score matrix for the sequence · D: The average of all token embeddings in the prompt | B | softmax(QK^T/√d_k) weights blend V into a new vector; the mask limits it to earlier positions [S4][S3]. |
| 3 | top-p | Which decoding method changes how many candidate tokens it keeps, based on the model's confidence? | A: Top-k sampling · B: Greedy decoding · C: Temperature scaling · D: Top-p (nucleus) sampling | D | Top-p keeps the smallest set reaching cumulative p, so its size adapts [S5][S12]. |
| 4 | lm-head | X is [N x d], and the vocabulary has |V| tokens. What shape are the logits used to predict the next token? | A: [1 x |V|] · B: [1 x d] · C: [N x N] · D: [d x |V|] | A | The last position's [1 x d] vector times E^T [d x |V|] gives [1 x |V|] [S3]. |
| 5 | residual-ffn | Which component moves information between token positions? | A: The feed-forward network · B: Layer normalisation · C: Self-attention · D: The residual addition | C | The FFN is position-wise; attention is the only part that mixes across positions [S3]. |
| 6 | causal-mask | While generating, how many tokens can the 4th token in the sequence attend to? | A: All tokens in the prompt · B: Tokens 1-4 (itself and earlier) · C: Only tokens 1-3 · D: Only tokens 5 onward | B | The causal mask sets scores for j > i to -inf, leaving itself and earlier tokens [S3]. |
| 7 | multi-head | d_model = 512 with 8 heads. What is d_k per head? | A: 512 · B: 4,096 · C: 8 · D: 64 | D | d_k = d_model / h = 64 in the base Transformer [S4]. |
| 8 | inference | What happens to the model's weights while it answers your prompt? | A: They stay fixed; it only conditions on context · B: They update slightly toward your prompt · C: Only the attention weights update · D: The KV cache rewrites the FFN weights | A | Generation is a forward pass; weights change only in training via cross-entropy loss [S3]. |

## 6. Related
- Prerequisites:
  - `vectors-dot-product` · Vectors and dot products · attention scores are dot products.
  - `matrix-multiplication` · Matrix multiplication · every stage is a matmul; shapes come from it.
  - `softmax` · Softmax · turns logits and scores into probabilities.
  - `neural-networks` · Neural networks and gradients · why √d_k scaling matters for training.
- Next:
  - `pretraining-scaling` · Pretraining and scaling laws · how these weights are learned at scale.
  - `rlhf` · Post-training (instruction tuning, RLHF) · how a base model becomes an assistant.
  - `flashattention` · FlashAttention and inference serving · making the N x N attention fast.
  - `bert` · Encoder-only models (BERT) · bidirectional attention for understanding tasks.
  - `mixture-of-experts` · Mixture of experts · replacing the FFN with routed experts.

## 7. Folder placement
- Parent folder: top level, because there is no ML or DL topic in the library yet (existing: Stacks, How-Do-Planes-Fly; neither is a parent).
- Adopts: none (Stacks and How-Do-Planes-Fly are not kinds or parts of LLMs). If an ML or DL topic is created later, LLM should move under it.

## 8. Sources to cite
- S1 · GPT-2 paper (Radford et al., 2019) · next-token factorisation, byte-level BPE, 50,257 vocab, 1024 context, pre-norm.
- S2 · Hugging Face LLM Course, BPE · how BPE merges are learned.
- S3 · Jurafsky and Martin, SLP3 ch. 7 · embeddings, mask, residual stream, FFN, LM head, cross-entropy, temperature numbers, top-k.
- S4 · Attention Is All You Need (2017) · attention equation, √d_k, multi-head sizes, sinusoidal positions, O(n²·d).
- S5 · Hugging Face decoding blog · greedy vs beam, temperature → greedy, top-p adaptivity.
- S6 · Hugging Face KV cache docs · what is cached, shapes, linear vs quadratic cost.
- S7 · RoFormer (RoPE) · rotary positions, relative dependence.
- S8 · LLaMA paper · LLaMA-7B/65B sizes, SwiGLU, RMSNorm, RoPE.
- S9 · The Illustrated GPT-2 (Alammar) · Q/K/V filing analogy, decoder-only, generation loop.
- S10 · GQA paper · shared KV heads shrink the cache.
- S11 · Thinking Machines, Defeating Nondeterminism · τ = 0 still nondeterministic (80 of 1,000 unique).
- S12 · Holtzman et al., nucleus sampling · top-p.
