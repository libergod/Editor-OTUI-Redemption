import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OTUI_STANDARD } from '@/lib/otui-standard';
import { t } from '@/lib/i18n';

interface OTUIStandardReferenceProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OTUIStandardReference({ isOpen, onClose }: OTUIStandardReferenceProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>OTUI Standard Reference - OTClient Redemption</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="syntax" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="syntax">Syntax</TabsTrigger>
            <TabsTrigger value="directives">Directives</TabsTrigger>
            <TabsTrigger value="states">States</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="widgets">Widgets</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            {/* Basic Syntax */}
            <TabsContent value="syntax" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Basic Syntax</h3>
                <pre className="bg-zinc-900 p-3 rounded text-sm">
                  {OTUI_STANDARD.syntax.basic}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Example</h3>
                <pre className="bg-zinc-900 p-3 rounded text-sm">
                  {OTUI_STANDARD.syntax.example}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Widget Inheritance</h3>
                <p className="text-muted-foreground mb-2">
                  {OTUI_STANDARD.inheritance.description}
                </p>
                <pre className="bg-zinc-900 p-3 rounded text-sm">
                  {OTUI_STANDARD.inheritance.example}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Anchors (Preferred Positioning)</h3>
                <p className="text-muted-foreground mb-2">
                  {OTUI_STANDARD.anchors.description}
                </p>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Parent Anchors:</h4>
                    {OTUI_STANDARD.anchors.parent.examples.map((ex, i) => (
                      <code key={i} className="block bg-zinc-900 px-2 py-1 rounded text-xs mb-1">
                        {ex}
                      </code>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Widget Anchors:</h4>
                    {OTUI_STANDARD.anchors.widgets.examples.map((ex, i) => (
                      <code key={i} className="block bg-zinc-900 px-2 py-1 rounded text-xs mb-1">
                        {ex}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Directives */}
            <TabsContent value="directives" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Text Directive (!text:)</h3>
                <p className="text-muted-foreground mb-2">
                  {OTUI_STANDARD.directives.text.description}
                </p>
                <p className="text-sm mb-1">Syntax: <code className="bg-zinc-900 px-2 py-1 rounded">{OTUI_STANDARD.directives.text.syntax}</code></p>
                <pre className="bg-zinc-900 p-3 rounded text-sm">
                  {OTUI_STANDARD.directives.text.example}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Event Handlers (@events)</h3>
                <p className="text-muted-foreground mb-2">
                  {OTUI_STANDARD.directives.events.description}
                </p>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-sm">Simple Handler:</h4>
                    <code className="block bg-zinc-900 px-2 py-1 rounded text-xs">
                      {OTUI_STANDARD.directives.events.examples.simple}
                    </code>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Escape Handler:</h4>
                    <code className="block bg-zinc-900 px-2 py-1 rounded text-xs">
                      {OTUI_STANDARD.directives.events.examples.escape}
                    </code>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Inline Function:</h4>
                    <pre className="bg-zinc-900 px-2 py-1 rounded text-xs whitespace-pre">
                      {OTUI_STANDARD.directives.events.examples.inline}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* States */}
            <TabsContent value="states" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Pseudo-States</h3>
                <p className="text-muted-foreground mb-2">
                  {OTUI_STANDARD.states.description}
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {OTUI_STANDARD.states.list.map((state, i) => (
                    <code key={i} className="bg-zinc-900 px-2 py-1 rounded text-xs text-center">
                      {state}
                    </code>
                  ))}
                </div>
                <pre className="bg-zinc-900 p-3 rounded text-sm">
                  {OTUI_STANDARD.states.example}
                </pre>
              </div>
            </TabsContent>
            
            {/* Layout */}
            <TabsContent value="layout" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Automatic Layout System</h3>
                <p className="text-muted-foreground mb-2">
                  {OTUI_STANDARD.layout.description}
                </p>
                <div className="mb-3">
                  <h4 className="font-medium text-sm mb-1">Layout Types:</h4>
                  <div className="flex gap-2">
                    {OTUI_STANDARD.layout.types.map((type, i) => (
                      <code key={i} className="bg-zinc-900 px-2 py-1 rounded text-xs">
                        {type}
                      </code>
                    ))}
                  </div>
                </div>
                <pre className="bg-zinc-900 p-3 rounded text-sm">
                  {OTUI_STANDARD.layout.example}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Common Properties</h3>
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-sm">Layout:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.properties.layout.map((prop, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {prop}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Visual:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.properties.visual.map((prop, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {prop}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">UIProgressBar:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.properties.progressBar.map((prop, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {prop}
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-500 mt-1">⚠️ NEVER use 'percent' - use value/minimum/maximum</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Widgets */}
            <TabsContent value="widgets" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Official Widget Types</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Containers:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.widgets.containers.map((w, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {w}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Text:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.widgets.text.map((w, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {w}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Buttons:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.widgets.buttons.map((w, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {w}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Images:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.widgets.images.map((w, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {w}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Progress Bars:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.widgets.bars.map((w, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {w}
                        </code>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Game:</h4>
                    <div className="flex flex-wrap gap-1">
                      {OTUI_STANDARD.widgets.game.map((w, i) => (
                        <code key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-xs">
                          {w}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">⚠️ Critical Rules</h3>
                <ul className="space-y-1 text-sm">
                  {OTUI_STANDARD.rules.map((rule, i) => (
                    <li key={i} className="text-yellow-500">• {rule}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Complete Example</h3>
                <pre className="bg-zinc-900 p-3 rounded text-xs overflow-x-auto">
                  {OTUI_STANDARD.completeExample}
                </pre>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
