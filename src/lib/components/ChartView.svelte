<script lang="ts">
  import { Chart, type ChartConfiguration } from 'chart.js/auto';

  let { config, height = 260 }: { config: ChartConfiguration; height?: number } = $props();

  let canvasEl: HTMLCanvasElement;
  let chart: Chart | null = null;

  $effect(() => {
    if (chart) chart.destroy();
    chart = new Chart(canvasEl, config);
    return () => {
      chart?.destroy();
      chart = null;
    };
  });
</script>

<div style={`height:${height}px`}>
  <canvas bind:this={canvasEl}></canvas>
</div>
