const { context, trace } = require('@opentelemetry/api');
const logsAPI = require('@opentelemetry/api-logs');
const {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
  BatchLogRecordProcessor,
} = require('@opentelemetry/sdk-logs');

const { ConsoleSpanExporter, SimpleSpanProcessor } = require( '@opentelemetry/sdk-trace-base');
const { WebTracerProvider } = require( '@opentelemetry/sdk-trace-web');
const { ZoneContextManager } = require( '@opentelemetry/context-zone');
const { B3Propagator } = require( '@opentelemetry/propagator-b3');

import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

// To start a logger, you first need to initialize the Logger provider.
const loggerProvider = new LoggerProvider();

// Add a processor to export log record
loggerProvider.addLogRecordProcessor(new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()));

// from https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/exporter-logs-otlp-http

// exporter options. see all options in OTLPExporterConfigBase
const collectorOptions = {
  url: 'http://localhost:4318/v1/logs', // url is optional and can be omitted - default is http://localhost:4318/v1/logs
  headers: {}, // an optional object containing custom headers to be sent with each request
  concurrencyLimit: 1, // an optional limit on pending requests
};

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(new OTLPLogExporter(collectorOptions)));

// To create a log record, you first need to get a Logger instance
// You can use a global singleton
logsAPI.logs.setGlobalLoggerProvider(loggerProvider);
const logger = logsAPI.logs.getLogger('default');

// tracing

const tracerProvider = new WebTracerProvider();

// Note: For production consider using the "BatchSpanProcessor" to reduce the number of requests
// to your exporter. Using the SimpleSpanProcessor here as it sends the spans immediately to the
// exporter without delay
tracerProvider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
tracerProvider.register({
  contextManager: new ZoneContextManager(),
  propagator: new B3Propagator(),
});
const webTracerWithZone = tracerProvider.getTracer('example-tracer-web');

// example of creating log events
var counter = 0;
const prepareClickEvent = () => {
  const url = 'https://httpbin.org/get';

  const element = document.getElementById('button1');

  const onClick = () => {
    // emit a log record
    const singleSpan = webTracerWithZone.startSpan('myapp-module-context');
    context.with(trace.setSpan(context.active(), singleSpan), () => {
      logger.emit({
        severityNumber: logsAPI.SeverityNumber.INFO,
        severityText: 'INFO',
        body: 'this is a log record body #' + counter++,
        attributes: { 'log.type': 'LogRecord' },        
      });
    })
  };
  element.addEventListener('click', onClick);
};

window.addEventListener('load', prepareClickEvent);
