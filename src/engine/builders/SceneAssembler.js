/**
 * High-level orchestrator placeholder connecting domain + existing SceneManager.
 * For now just builds domain & logs metrics; does not alter current SceneManager workflow.
 */
import { DomainBuilder } from '../../domain/services/DomainBuilder.js';
import { MetricsService } from '../../domain/services/MetricsService.js';

export class SceneAssembler {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.metricsService = new MetricsService();
  }

  buildDomain(uiConfig, missingLocations) {
    const builder = new DomainBuilder({ uiConfig, missingLocations });
    const domain = builder.build();
    const metrics = this.metricsService.compute(domain);
    this.eventBus && this.eventBus.publish({ type: 'MetricsUpdated', payload: metrics });
    return { domain, metrics };
  }
}
