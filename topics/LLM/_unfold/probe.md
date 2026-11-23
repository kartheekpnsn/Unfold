# Probe: LLM

- **Why:** Interview or exam: needs to explain LLMs clearly and correctly under pressure.
- **Starting point:** Knows the words (tokens, transformer, attention) but not how they fit together.
- **Scope:** How the model works: tokenization, embeddings (incl. positional information), self-attention (Q/K/V, multi-head, causal masking), transformer blocks (residuals, layer norm, MLP), the output layer/softmax over the vocabulary, autoregressive generation and sampling (temperature, top-k/top-p), KV cache and context window. Training is mentioned only as much as needed to explain inference (next-token prediction objective).

*Research focus:* the decoder-only transformer as used in LLMs, explained as a dependency chain from tokens to sampled next token, with interview-grade precision (shapes, what attention computes and why, why causal masking, what temperature does), common interview questions, and common misconceptions.
