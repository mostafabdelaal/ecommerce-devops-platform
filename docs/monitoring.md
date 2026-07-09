# Observability & Monitoring

CloudMart implements a comprehensive observability stack covering both Metrics and Logging, allowing DevOps engineers to seamlessly monitor application health and infrastructure performance. All monitoring tools are defined in the `k8s/monitoring` directory.

## Metrics (Prometheus + Grafana)

We use Prometheus to aggregate time-series metrics from our Kubernetes cluster and applications, and Grafana to visualize them.

### Prometheus (`prometheus.yaml`)
- **Scraping**: Configured to scrape all pods in the cluster via `kubernetes_sd_configs`.
- **Annotations**: Prometheus automatically discovers pods containing the `prometheus.io/scrape: "true"` annotation.
- **Port mapping**: Pods can expose metrics on a custom port by defining the `prometheus.io/port` annotation.

### Grafana (`grafana.yaml`)
- **Datasources**: Auto-configured via a Kubernetes ConfigMap to connect directly to the internal Prometheus service (`http://prometheus:9090`).
- **Access**: Exposed securely via AWS ALB Ingress with ACM SSL certificates at `grafana.<your-domain>`.

## Logging (EFK Stack)

We aggregate logs from all container stdout/stderr streams to a centralized Elasticsearch cluster using Fluent-bit, creating a searchable database of application events.

### Fluent-bit (`fluent-bit.yaml`)
- Deployed as a `DaemonSet`, ensuring that exactly one Fluent-bit pod runs on every EKS node.
- Mounts `/var/log` and `/var/lib/docker/containers` directly from the host node to capture raw container logs.
- Enriches logs with Kubernetes metadata (namespace, pod name, container ID) using the `kubernetes` filter.
- Forwards parsed and enriched logs to the `elasticsearch` service on port 9200.

### Elasticsearch (`elasticsearch.yaml`)
- Stores the indexed logs securely inside the cluster.
- Highly scalable, capable of ingesting high-throughput streams from multiple Fluent-bit agents.

### Kibana (`kibana.yaml`)
- Visualizes the data stored in Elasticsearch.
- Provides a powerful UI for developers to perform full-text searches, create dashboards, and trace request flows across microservices.
- Exposed securely via AWS ALB Ingress at `kibana.<your-domain>`.

## Ingress Architecture (`ingress.yaml`)

To avoid exposing administrative interfaces to the public internet unnecessarily, but still providing easy access to the DevOps team, we map the dashboards via a single Application Load Balancer using host-based routing:

```yaml
rules:
  - host: grafana.abdallahgabr.me
    http:
      paths:
        - path: /
          backend:
            service:
              name: grafana
              port: 3000
  - host: kibana.abdallahgabr.me
    http:
      paths:
        - path: /
          backend:
            service:
              name: kibana
              port: 5601
```
