export function createNightOpsStore() {
  const analyses = [];
  let latestShiftReport = null;

  return {
    setLatestAnalysis(result) {
      analyses.push(result);
      if (analyses.length > 50) {
        analyses.shift();
      }
    },
    getLatestAnalysis() {
      return analyses.at(-1) || null;
    },
    getAnalysesBetween(start, end) {
      const startTs = new Date(start).getTime();
      const endTs = new Date(end).getTime();
      return analyses.filter((analysis) => {
        const analysisTs = new Date(analysis.generatedAt).getTime();
        return analysisTs >= startTs && analysisTs <= endTs;
      });
    },
    setLatestShiftReport(report) {
      latestShiftReport = report;
    },
    getLatestShiftReport() {
      return latestShiftReport;
    },
  };
}
