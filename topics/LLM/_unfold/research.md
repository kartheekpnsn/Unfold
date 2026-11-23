# Research: Large Language Models

- Slug: llm · Duration: 30m · Researched: 2026-11-23 · Sources: 12
- Focus (from probe): the decoder-only transformer, as a dependency chain from text to a sampled next token, at interview-grade precision (shapes, what attention computes and why, causal masking, temperature), with common interview questions and misconceptions.

## 1. Key concepts (dependency chain)
1. **Next-token prediction**: a language model factorizes the probability of a text into a product of conditionals p(s_n | s_1..s_{n-1}); an LLM's whole job is to output that next-token distribution · [S1]
2. **Tokenization** (needs 1): text is cut into subword tokens from a fixed vocabulary using learned byte-pair-encoding (BPE) merges; each token becomes an integer id · [S2]
3. **Token embeddings** (needs 2): each id selects one row of an embedding matrix E of shape [|V| x d], giving a d-dimensional vector per token · [S3]
4. **Positional information** (needs 3): attention by itself ignores order, so position is injected, either by adding a position vector (learned or sinusoidal) or by rotating queries/keys (RoPE) · [S4]
5. **Self-attention: Q, K, V** (needs 3, 4): each token's vector is projected into a query, a key and a value; softmax(QK^T / sqrt(d_k)) gives weights that mix the values · [S4]
6. **Causal masking** (needs 5): scores for future positions are set to -inf before softmax so a token can only attend to itself and earlier tokens · [S3]
7. **Multi-head attention** (needs 5, 6): h heads run attention in parallel on d/h-sized projections and their outputs are concatenated and projected back to d · [S4]
8. **Transformer block and residual stream** (needs 7): pre-norm, attention, add back; pre-norm, position-wise MLP, add back; blocks are stacked many times · [S3]
9. **LM head and softmax** (needs 8): the last position's final vector is multiplied by an unembedding matrix ([d x |V|], often E^T) to get |V| logits, and softmax turns them into probabilities · [S3]
10. **Training objective** (needs 9): cross-entropy on the true next token at every position (teacher forcing); the causal mask makes every position a training example in one pass · [S3]
11. **Autoregressive generation** (needs 9): pick a token from the distribution, append it, run again, until an end token or the length limit · [S5]
12. **Decoding: temperature, top-k, top-p** (needs 11): reshape (divide logits by tau) or truncate (keep top k tokens, or the smallest set with cumulative probability >= p) the distribution before sampling · [S3]
13. **KV cache** (needs 6, 11): because of the causal mask, past keys and values never change, so they are stored per layer and only the new token's q, k, v are computed each step · [S6]
14. **Context window** (needs 4, 13): the maximum number of tokens the model can take as input (GPT-2 raised it from 512 to 1024 tokens) · [S1]

## 2. Claims
### Next-token prediction
- GPT-2's paper frames language modeling as estimating p(x) = product over n of p(s_n | s_1, ..., s_{n-1}), which makes both sampling and scoring tractable · [S1]
- For a decoder-only LLM, the language modeling head predicts a next token at every position during training, but at inference only the last position's output is used to predict token N+1 · [S3]

### Tokenization
- BPE training starts from a base vocabulary of characters and repeatedly merges the most frequent adjacent pair into a new token, recording each merge as a rule, until a target vocabulary size is reached · [S2]
- GPT-2 uses byte-level BPE: base vocabulary of 256 bytes, so any Unicode string can be encoded with no unknown token; a Unicode-code-point base would need over 130,000 symbols · [S1]
- GPT-2's vocabulary is 50,257 tokens; typical BPE vocabularies were 32,000 to 64,000 · [S1]

### Token embeddings
- The embedding matrix E has shape [|V| x d]; a token id selects its row (equivalently a one-hot [1 x |V|] vector times E), giving a [1 x d] vector · [S3]
- The N input tokens are packed into a matrix X of shape [N x d], one row per token, so the whole block can be computed with matrix multiplications in parallel · [S3]

### Positional information
- Token embeddings are not position-dependent; without extra position signal the model cannot tell word order · [S3]
- The original Transformer adds sinusoidal encodings PE(pos,2i) = sin(pos/10000^(2i/d_model)), PE(pos,2i+1) = cos(...); learned positional embeddings gave nearly identical results · [S4]
- RoPE encodes absolute position by rotating query and key vectors, which makes the attention score depend on relative position; it is applied inside attention at each layer · [S7]

### Self-attention: Q, K, V
- Each input x_i plays three roles, captured by learned matrices: q_i = x_i W^Q (the current element asking), k_j = x_j W^K (an element being compared), v_j = x_j W^V (what gets summed) · [S3]
- Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V · [S4]
- Why divide by sqrt(d_k): if q and k components are independent with mean 0 and variance 1, their dot product has variance d_k; large values push softmax into regions with tiny gradients · [S4]
- QK^T is an N x N matrix of scores, so attention is quadratic in input length; the original paper gives per-layer complexity O(n^2 * d) · [S4]

### Causal masking
- Without a mask, QK^T scores each query against keys that come after it, which makes next-word prediction trivial ("guessing the next word is pretty simple if you already know it") · [S3]
- The mask M has M_ij = -inf for j > i (upper triangle) and 0 otherwise; softmax turns -inf into weight 0 · [S3]

### Multi-head attention
- MultiHead(Q,K,V) = Concat(head_1..head_h) W^O; base Transformer uses h = 8, d_model = 512, d_k = d_v = 64 · [S4]
- LLaMA-7B (6.7B) has d = 4096, 32 heads, 32 layers; 65B has d = 8192, 64 heads, 80 layers · [S8]

### Transformer block and residual stream
- Residual-stream view: each token has a d-dimensional stream; attention and the FFN read from it and add their output back · [S3]
- The FFN is position-wise: same weights at every position, no mixing across tokens; attention is the only component that moves information between positions · [S3]
- d_ff is commonly 4d (original: d = 512, d_ff = 2048); FFNs hold most of the parameters · [S3]
- Most LLMs now use a gated SwiGLU FFN instead of ReLU; because the gate adds parameters, d_ff is set a bit below 4d · [S3]
- GPT-2 moved layer norm to the input of each sub-block (pre-norm) and added a final layer norm after the last self-attention block · [S1]

### LM head and softmax
- The final [1 x d] vector is projected to a [1 x |V|] logit vector u = h E^T; reusing E transposed is weight tying, and E^T is called the unembedding · [S3]
- y = softmax(u) is a probability distribution over the whole vocabulary · [S3]

### Training objective
- Loss is cross-entropy; with a one-hot target it reduces to -log of the probability given to the true next token · [S3]
- Teacher forcing: the model always gets the true prefix, never its own earlier guesses, during training · [S3]

### Autoregressive generation
- Generated tokens are appended to the input and the extended sequence is fed back, until end-of-sequence or the context limit (1024 for GPT-2) · [S9]
- Greedy decoding picks the top token each step; it is deterministic and tends to repeat · [S3]
- Greedy can miss better sequences: in Hugging Face's example ("The","nice","woman") scores 0.5 x 0.4 = 0.2 while ("The","dog","has") scores 0.36 · [S5]

### Decoding: temperature, top-k, top-p
- Temperature divides logits by tau before softmax: y = softmax(u / tau) · [S3]
- SLP3 example, logits [1.2, 0.9, 0.1, -0.5]: top token gets 0.44 at tau = 1, 0.59 at tau = 0.5, 0.95 at tau = 0.1; at tau = 100 all are about 0.25 · [S3]
- Lowering temperature sharpens the distribution toward likely tokens; as tau -> 0, sampling becomes equivalent to greedy decoding · [S5]
- tau > 1 (high-temperature sampling) flattens the distribution toward uniform · [S3]
- Top-k: keep k most likely tokens, renormalize, sample; k = 1 is greedy; fixed k is too loose for sharp distributions, too tight for flat ones · [S3]
- Top-p (nucleus): keep the smallest set whose cumulative probability >= p; set size adapts (in HF's example p = 0.92 kept 9 tokens in one case, 3 in another) · [S5]

### KV cache
- With causal attention, a processed token's k and v never change, so K_past and V_past are cached; each step computes only the new token's q, k, v and appends k, v · [S6]
- Caching is per layer; cache tensors have shape [batch, num_heads, seq_len, head_dim] · [S6]
- Without cache, per-step attention cost is quadratic in sequence length; with cache, linear, but memory grows linearly · [S6]
- Multi-query attention (one shared KV head) speeds decoding but can cost quality; grouped-query attention shares KV heads among groups of query heads and gets close to multi-head quality · [S10]

### Context window
- GPT-2 raised the context from 512 to 1024 tokens · [S1]
- Current LLM inputs can be hundreds of thousands of tokens, and long-context mechanisms reach millions · [S3]

## 3. Analogies for ELI5
1. **Filing cabinet (Q/K/V)**: query = sticky note with your search topic, keys = folder labels, values = folder contents; you take a blend of contents weighted by how well each label matches · [S9] · where it breaks: you get a soft mix of all folders, not one folder, and with the mask you can only open folders filed before you.
2. **Phone autocomplete on repeat**: predict the next word, accept it, predict again · where it breaks: hides that each step re-reads the whole context through many layers, and that the output is a full probability distribution, not one guess.
3. **Shared whiteboard (residual stream)**: each token has its own whiteboard; attention copies notes from earlier tokens' boards, the MLP rewrites each board on its own; nobody erases, they only add · [S3] · where it breaks: real "notes" are vectors in shared subspaces, not separate readable facts.
- Pick: 1 for attention and 3 for the block. Both match how SLP3 and Alammar teach it and map straight to interview answers. Use 2 only as a hook.

## 4. Visual metaphors
| Concept | What the animation could show | Step-by-step state changes | 3D needed? | Why |
|---|---|---|---|---|
| Tokenization | sentence breaking into colored chips with integer ids | raw text → characters → merges fire one by one ("u"+"g"→"ug") → final chips with ids | no | a flat sequence |
| Embedding + position | each chip lights a row of a tall [|V| x d] table; a position bar is added | id → row lookup → + position vector (or rotation arrow for RoPE) → row of X [N x d] | no | matrix lookups read best flat |
| Q/K/V attention | one token sends a query beam to earlier tokens' key tags; score bars; softmax; weighted value blend | pick token i → project q,k,v → dot products → /sqrt(d_k) → softmax bars → weighted sum | no | a 2D grid shows it all |
| Causal mask | N x N score grid with the upper triangle going dark (-inf) then 0 after softmax | full grid → mask upper triangle → softmax per row → rows sum to 1 | no | the triangle is the image interviewers expect |
| Multi-head | the d-wide vector split into h colored slices, each with its own grid, then concatenated and W^O | split → h grids light at once → concat → project | no | parallel lanes |
| Block / residual stream | vertical lane per token; attention arrows cross lanes, MLP boxes stay in-lane; outputs "+" into the lane | LN → attn → add → LN → MLP → add; repeat x L | optional | a shallow 3D stack of blocks can show depth, but 2D lanes are clearer |
| LM head + temperature | final vector → |V| logit bars → softmax; slider for tau reshapes bars (0.44 → 0.59 → 0.95) | logits → softmax at tau=1 → drag to 0.5 → 0.1 → 10 | no | bar charts |
| Top-k / top-p | sorted bars with a cutoff line; for top-p a running-sum line crossing p | sort → cut at k → renormalize; vs. cumulative to p → renormalize → sample | no | 1D bars |
| Generation loop + KV cache | token appended to input; stacks of K and V cards grow by one per layer per step | step t: compute q,k,v for new token only → append to stacks → attend → sample → repeat | no | growing stacks show linear memory |

## 5. Common misconceptions
- **Myth:** The model outputs a word. · **Why it's wrong:** the head outputs a score for every vocabulary token. · **Correct idea:** it outputs a distribution over |V| tokens; a separate decoding step picks one · [S3]
- **Myth:** Tokens are words. · **Why it's wrong:** BPE tokens are subwords or bytes; frequent words can be one token, rare words several. · **Correct idea:** a token is a vocabulary entry from learned merges (GPT-2: 50,257 entries) · [S1]
- **Myth:** Causal masking is like BERT's [MASK] token. · **Why it's wrong:** the input is not changed; future scores are set to -inf inside attention. · **Correct idea:** the mask is an upper-triangular -inf matrix added to the scores · [S9]
- **Myth:** Dividing by sqrt(d_k) is just normalization for numbers. · **Why it's wrong:** it fixes a specific problem. · **Correct idea:** dot products have variance d_k; without scaling, softmax saturates and gradients become tiny · [S4]
- **Myth:** Temperature 0 makes every API answer the same. · **Why it's wrong:** greedy is deterministic in theory, but servers batch requests and many kernels are not batch-invariant. · **Correct idea:** in one test, 1,000 completions at temperature 0 gave 80 unique outputs; batch-invariant kernels made all 1,000 identical · [S11]
- **Myth:** Higher temperature makes the model smarter or more creative. · **Why it's wrong:** it only rescales logits. · **Correct idea:** tau < 1 sharpens toward greedy, tau > 1 flattens toward uniform; the model's knowledge does not change · [S3]
- **Myth:** The KV cache stores queries too / caches the answer. · **Why it's wrong:** only the newest token's query is needed. · **Correct idea:** only past K and V are cached, per layer · [S6]
- **Myth:** The model learns from your prompt at inference. · **Why it's wrong:** generation is a forward pass; no loss is computed and no weights change. · **Correct idea:** parameters are changed only in training, by minimizing cross-entropy on next tokens; at inference the model only conditions on the context · [S3]
- **Myth:** LLMs use the full encoder-decoder Transformer. · **Why it's wrong:** GPT-style models use only the decoder blocks. · **Correct idea:** decoder-only stack with masked self-attention, no cross-attention · [S9]

## 6. Trade-offs / when (not) to use
- Greedy: deterministic, but repetitive · [S3]
- Beam search: finds higher-probability sequences than greedy, but repetitive and poor for open-ended text · [S5]
- Top-k vs top-p: top-k is simple but fixed-width; top-p adapts to the model's confidence · [S3]
- Learned absolute positions vs RoPE: absolute vectors are simple but capped at the trained length (GPT-2: 1024); RoPE gives relative dependence and flexible length · [S7]
- Post-norm vs pre-norm: pre-norm "works better" but needs an extra final layer norm · [S3]
- KV cache: saves compute (linear per step instead of quadratic) at the cost of memory that grows with sequence length; MQA/GQA shrink it by sharing KV heads · [S10]
- Alternatives: encoder-only (BERT) when you need bidirectional understanding instead of generation · [S9]

## 7. Timeline / story
- 2015: Sennrich et al. use BPE subwords for neural language processing; GPT-2 builds on it · [S1]
- 2017: "Attention Is All You Need" introduces the Transformer (arXiv 12 June 2017) · [S4]
- 2019: GPT-2: decoder-only, byte-level BPE, 50,257 vocab, 1024 context, pre-norm · [S1]
- 2019-2020: Nucleus sampling (arXiv April 2019, ICLR 2020) · [S12]
- 2021: RoPE (RoFormer, arXiv 20 April 2021) · [S7]
- 2023: LLaMA (7B-65B) combines pre-norm RMSNorm, SwiGLU, RoPE · [S8]
- 2023: GQA (EMNLP 2023) · [S10]
- 2025: Thinking Machines show temperature-0 nondeterminism comes from batch variance · [S11]

## 8. Prerequisites and next topics
- Prerequisites: vectors and dot products (attention is dot products), matrix multiplication (shapes), softmax (turns scores into probabilities), basic neural network/gradient idea (why sqrt(d_k) matters).
- Next: Pretraining and scaling laws, post-training (instruction tuning, RLHF), FlashAttention / inference serving, long-context methods, encoder-only models (BERT), mixture-of-experts.
- Broader topic this is a kind/part of: Deep Learning (Transformers) within Machine Learning.

## 9. Suggested quiz items
- Attention: why divide by sqrt(d_k)? · answer: dot-product variance grows with d_k and saturates softmax, shrinking gradients · common wrong answer: "to normalize to probabilities" (that's softmax) · [S4]
- Causal mask: what value goes in masked cells and why? · answer: -inf, so softmax gives 0 weight to future tokens · common wrong answer: 0 (a 0 score still gets positive weight) · [S3]
- Shapes: X is [N x d]; what is the shape of QK^T? · answer: N x N · common wrong answer: d x d · [S3]
- Multi-head: d_model 512, 8 heads; per-head d_k? · answer: 64 · common wrong answer: 512 · [S4]
- LM head: shape of logits for one position? · answer: [1 x |V|] · common wrong answer: [1 x d] · [S3]
- Temperature: logits [1.2, 0.9, 0.1, -0.5]; what happens to the top token's probability going tau 1 → 0.1? · answer: 0.44 → 0.95 · common wrong answer: it goes down · [S3]
- Top-p vs top-k: which adapts the candidate count? · answer: top-p · common wrong answer: top-k · [S5]
- KV cache: what is cached and what isn't? · answer: past K and V per layer; not Q · common wrong answer: all of Q, K, V · [S6]
- KV cache: why is it valid? · answer: causal mask means past k, v never depend on future tokens · common wrong answer: "because weights are frozen" (only half the reason) · [S6]
- FFN vs attention: which mixes information across positions? · answer: attention only; FFN is position-wise · common wrong answer: both · [S3]
- Training: what is the loss for one position? · answer: -log p(true next token) · common wrong answer: squared error on embeddings · [S3]
- Tokenization: why byte-level BPE in GPT-2? · answer: 256-byte base covers any string with no unknown token · common wrong answer: smaller vocabulary · [S1]
- Determinism: is temperature 0 always reproducible in an API? · answer: no, batch-size variation changes numerics · common wrong answer: yes · [S11]
- Positional info: why is it needed at all? · answer: attention is order-blind; token embeddings carry no position · common wrong answer: "the model reads left to right anyway" · [S3]

## 10. Gaps and conflicts
- LLaMA vocab size (32k) and 2048 context length were not confirmed from the fetched page text; omitted.
- Alammar says GPT-2 vocab is "50,000 words"; the GPT-2 paper says 50,257. Trust the paper.
- Original paper (post-norm) vs GPT-2/LLaMA/SLP3 (pre-norm): both are real; modern LLMs use pre-norm. SLP3 says pre-norm "works better"; the Pre-LN analysis paper (Xiong et al., 2020, arXiv 2002.04745) was opened and agrees (better-behaved gradients at init) but is not cited, to stay within the 30m source budget.
- Claims that FFNs "encode most factual knowledge" (SLP3, citing Geva 2021 and Meng 2022) are research findings, not settled; left out of the claims.
- Long-context use: "Lost in the Middle" (arXiv 2307.03172, opened) reports models use mid-context information worst; not cited, out of budget, but useful if the lesson covers context limits.
- KV cache memory formula (2 x layers x heads x head_dim x seq_len x bytes) is implied by the HF cache shapes but no source states it as a formula; teach it as derived from [batch, heads, seq_len, head_dim] per layer for K and V.
