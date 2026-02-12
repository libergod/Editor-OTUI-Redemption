import { OTUIWidget } from './otui-types';

/**
 * Checks if a property key is a valid OTCR property
 */
function isValidOTCRProperty(key: string): boolean {
  // Special OTCR features
  if (key.startsWith('!')) return true; // Directives: !text:
  if (key.startsWith('@')) return true; // Events: @onClick:, @onEscape:
  if (key.startsWith('$')) return true; // States: $hover:, $pressed:, $disabled:
  if (key.startsWith('__')) return true; // Metadata: __i18n.text
  
  // Namespaced properties
  if (key.startsWith('anchors.')) return true;
  if (key.startsWith('layout.')) return true;
  if (key.startsWith('margin-')) return true;
  if (key.startsWith('image-')) return true;
  if (key.startsWith('text-')) return true;
  if (key.startsWith('border-')) return true;
  
  // Standard properties
  const validProps = [
    'id', 'size', 'width', 'height', 'x', 'y',
    'text', 'color', 'font', 'background-color', 'background',
    'padding', 'opacity', 'visible', 'enabled',
    'value', 'minimum', 'maximum', 'percent',
    'tooltip', 'focusable', 'phantom',
  ];
  
  return validProps.includes(key);
}

export interface OTUIIssue {
  type: 'error' | 'warning' | 'info';
  category: 'syntax' | 'property' | 'structure' | 'performance';
  widgetId: string;
  widgetName: string;
  message: string;
  autoFixable: boolean;
}

export interface OTUIValidationResult {
  isValid: boolean;
  issues: OTUIIssue[];
  score: number; // 0-100
  needsAutoFix: boolean;
}

/**
 * Validates OTUI widgets for OTClient Redemption compatibility
 */
export function validateOTUI(widgets: OTUIWidget[]): OTUIValidationResult {
  const issues: OTUIIssue[] = [];
  
  function validateWidget(widget: OTUIWidget, depth = 0) {
    const props = widget.properties;
    
    // Check for missing ID
    if (!props.id) {
      issues.push({
        type: 'warning',
        category: 'property',
        widgetId: widget.id,
        widgetName: widget.name,
        message: 'Missing "id" property - recommended for widget identification',
        autoFixable: true
      });
    }
    
    // Check for widgets that need explicit dimensions
    const needsDimensions = [
      'UIButton', 'UITextEdit', 'UIProgressBar', 
      'UICheckBox', 'UIPanel', 'UIScrollArea'
    ];
    
    if (needsDimensions.includes(widget.type)) {
      const hasSize = props.size || (props.width && props.height);
      const hasAnchors = Object.keys(props).some(k => k.startsWith('anchors.'));
      const hasAnchorFill = props['anchors.fill'] === 'parent';
      
      if (!hasSize && !hasAnchorFill) {
        issues.push({
          type: 'warning',
          category: 'property',
          widgetId: widget.id,
          widgetName: widget.name,
          message: `${widget.type} should have explicit size (width/height or size property)`,
          autoFixable: true
        });
      }
    }
    
    // Check for text without tr() or !text: directive
    // OTCR Standard: !text: tr('string') is the preferred method
    if (props.text && props['__i18n.text'] !== 'true') {
      issues.push({
        type: 'info',
        category: 'syntax',
        widgetId: widget.id,
        widgetName: widget.name,
        message: 'Text should use !text: tr() directive for internationalization (OTCR Standard)',
        autoFixable: true
      });
    }
    
    // Check for border-color without border-width
    if (props['border-color'] && !props['border-width']) {
      issues.push({
        type: 'warning',
        category: 'property',
        widgetId: widget.id,
        widgetName: widget.name,
        message: 'border-color defined without border-width',
        autoFixable: true
      });
    }
    
    // Check for both x/y and anchors (conflicting positioning)
    const hasPosition = props.x !== undefined || props.y !== undefined;
    const hasAnchors = Object.keys(props).some(k => k.startsWith('anchors.'));
    
    if (hasPosition && hasAnchors) {
      issues.push({
        type: 'warning',
        category: 'property',
        widgetId: widget.id,
        widgetName: widget.name,
        message: 'Widget has both x/y and anchors - anchors take precedence',
        autoFixable: true
      });
    }
    
    // Check for invalid property values
    if (props.visible && !['true', 'false'].includes(props.visible)) {
      issues.push({
        type: 'error',
        category: 'property',
        widgetId: widget.id,
        widgetName: widget.name,
        message: `Invalid visible value: "${props.visible}" (must be "true" or "false")`,
        autoFixable: true
      });
    }
    
    // Check for UIProgressBar with percent instead of value/minimum/maximum
    if (widget.type === 'UIProgressBar') {
      if (props.percent !== undefined && (!props.value || !props.minimum || !props.maximum)) {
        issues.push({
          type: 'warning',
          category: 'property',
          widgetId: widget.id,
          widgetName: widget.name,
          message: 'UIProgressBar should use value/minimum/maximum instead of percent (OTCR Standard)',
          autoFixable: true
        });
      }
    }
    
    // Check for UISlider with percent instead of value
    if (widget.type === 'UISlider' && props.percent !== undefined) {
      issues.push({
        type: 'info',
        category: 'property',
        widgetId: widget.id,
        widgetName: widget.name,
        message: 'UISlider can use value/minimum/maximum for better compatibility',
        autoFixable: false
      });
    }
    
    // Check for margins with value "0 0 0 0" (unnecessary)
    const marginProps = ['margin-top', 'margin-bottom', 'margin-left', 'margin-right'];
    const allZeroMargins = marginProps.every(m => props[m] === '0' || props[m] === undefined);
    if (marginProps.some(m => props[m] === '0') && allZeroMargins) {
      issues.push({
        type: 'info',
        category: 'performance',
        widgetId: widget.id,
        widgetName: widget.name,
        message: 'Zero margins can be omitted',
        autoFixable: true
      });
    }
    
    // Recursively validate children
    widget.children.forEach(child => validateWidget(child, depth + 1));
  }
  
  widgets.forEach(w => validateWidget(w));
  
  // Calculate quality score
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;
  
  const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5) - (infoCount * 1));
  const needsAutoFix = issues.some(i => i.autoFixable);
  
  return {
    isValid: errorCount === 0,
    issues,
    score,
    needsAutoFix
  };
}

/**
 * Automatically fixes common OTUI issues
 */
export function autoFixOTUI(widgets: OTUIWidget[]): OTUIWidget[] {
  // If there are multiple root widgets without a container, wrap them
  let rootWidgets = widgets;
  if (widgets.length > 1) {
    const containerWidget: OTUIWidget = {
      id: 'auto_container_' + Date.now(),
      name: 'MainContainer',
      type: 'UIPanel',
      parentId: null,
      properties: {
        id: 'maincontainer',
        size: '800 600',
        'background-color': '#2a2a2a'
      },
      children: widgets.map(w => ({ ...fixWidget(w), parentId: 'auto_container_' + Date.now() }))
    };
    return [containerWidget];
  }
  
  function fixWidget(widget: OTUIWidget): OTUIWidget {
    const fixed = { ...widget };
    const props = { ...fixed.properties };
    
    // Auto-generate ID if missing
    if (!props.id) {
      props.id = widget.name.toLowerCase().replace(/\s+/g, '');
    }
    
    // Add dimensions for widgets that need them
    const needsDimensions = ['UIButton', 'UITextEdit', 'UIProgressBar', 'UICheckBox', 'UIPanel', 'UIScrollArea'];
    if (needsDimensions.includes(widget.type)) {
      const hasSize = props.size || (props.width && props.height);
      const hasAnchorFill = props['anchors.fill'] === 'parent';
      
      if (!hasSize && !hasAnchorFill) {
        // Use default dimensions based on widget type
        switch (widget.type) {
          case 'UIButton':
            if (!props.size) props.size = '100 30';
            break;
          case 'UITextEdit':
            if (!props.size) props.size = '150 20';
            break;
          case 'UIProgressBar':
            if (!props.size) props.size = '200 20';
            break;
          case 'UICheckBox':
            if (!props.size) props.size = '16 16';
            break;
          case 'UIPanel':
            // Panel usually spans content, but give it default if nothing
            if (!props.size && !Object.keys(props).some(k => k.startsWith('anchors.'))) {
              props.size = '200 200';
            }
            break;
          case 'UIScrollArea':
            if (!props.size) props.size = '200 150';
            break;
        }
      }
    }
    
    // Wrap text in tr() if not already
    if (props.text && !props.text.startsWith('tr(')) {
      const cleanText = props.text.replace(/^["']|["']$/g, ''); // Remove outer quotes if present
      props.text = `tr('${cleanText}')`;
    }
    
    // Add border-width if border-color exists
    if (props['border-color'] && !props['border-width']) {
      props['border-width'] = '1';
    }
    
    // Remove x/y if anchors exist (anchors take precedence)
    const hasAnchors = Object.keys(props).some(k => k.startsWith('anchors.'));
    if (hasAnchors) {
      delete props.x;
      delete props.y;
    }
    
    // Fix visible property
    if (props.visible && !['true', 'false'].includes(props.visible)) {
      props.visible = 'true';
    }
    
    // Convert UIProgressBar percent to value/minimum/maximum (OTCR Standard)
    if (widget.type === 'UIProgressBar') {
      if (props.percent !== undefined) {
        const percentValue = Number(props.percent) || 0;
        props.value = String(percentValue);
        props.minimum = '0';
        props.maximum = '100';
        delete props.percent;
      }
      // Ensure value/minimum/maximum exist
      if (!props.value) props.value = '0';
      if (!props.minimum) props.minimum = '0';
      if (!props.maximum) props.maximum = '100';
    }
    
    // UISlider: convert percent to value if needed
    if (widget.type === 'UISlider' && props.percent !== undefined) {
      const percentValue = Number(props.percent) || 0;
      props.value = String(percentValue);
      if (!props.minimum) props.minimum = '0';
      if (!props.maximum) props.maximum = '100';
      delete props.percent;
    }
    
    // Remove zero margins
    const marginProps = ['margin-top', 'margin-bottom', 'margin-left', 'margin-right'];
    marginProps.forEach(m => {
      if (props[m] === '0') delete props[m];
    });
    
    fixed.properties = props;
    
    // Recursively fix children
    fixed.children = widget.children.map(fixWidget);
    
    return fixed;
  }
  
  return widgets.map(fixWidget);
}
