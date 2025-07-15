"use client";

import React, { useState, useEffect } from 'react';

interface Config {
  token: string;
  ownerID: string;
  prefix: string;
  userinfo: {enabled: boolean };
  help: { enabled: boolean };
  ping: { enabled: boolean };
  clear: { enabled: boolean };
  hoststatus: { enabled: boolean };
  rotatestatus: {
    enabled: boolean;
    interval: number;
    emoji: { [key: string]: string };
    message: { [key: string]: string };
  };
  rpc: {
    enabled: boolean;
    mode: string;
    name: string;
    url: string;
    type: number;
    application_id: string;
    client_id: string;
    details: string;
    state: string;
    large_image: string;
    large_image_text: string;
    small_image: string;
    small_image_text: string;
    buttons: { name1: string; url1: string; name2: string; url2: string };
  };
  qr: {
    enabled: boolean;
    addrinfo: string;
    bankid: string;
    style: string;
    accountname: string;
  };
  voice: {
    enabled: boolean;
    channel_id: string;
    self_deaf: boolean;
    self_mute: boolean;
  };
  auto_react: {
    enabled: boolean;
    reactions: { [key: string]: string[] };
  };
}

export default function Home() {
  const [config, setConfig] = useState<Config>({
    token: '',
    ownerID: '',
    prefix: '',
    userinfo: { enabled: false },
    help: { enabled: false },
    ping: { enabled: false },
    clear: { enabled: false },
    hoststatus: { enabled: false },
    rotatestatus: { enabled: false, interval: 0, emoji: {}, message: {} },
    rpc: {
      enabled: false,
      mode: '',
      name: '',
      url: '',
      type: 0,
      application_id: '',
      client_id: '',
      details: '',
      state: '',
      large_image: '',
      large_image_text: '',
      small_image: '',
      small_image_text: '',
      buttons: { name1: '', url1: '', name2: '', url2: '' },
    },
    qr: { enabled: false, addrinfo: '', bankid: '', style: '', accountname: '' },
    voice: { enabled: false, channel_id: '', self_deaf: false, self_mute: false },
    auto_react: { enabled: false, reactions: {} },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');
        const data = await response.json();
        setConfig({
          ...data,
          rotatestatus: {
            ...data.rotatestatus,
            emoji: data.rotatestatus.emoji || {},
            message: data.rotatestatus.message || {},
          },
          auto_react: {
            ...data.auto_react,
            reactions: data.auto_react.reactions || {},
          },
        });
        setLoading(false);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Unknown error');
        }
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to update config');
      setSuccess('Configuration updated successfully!');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleBooleanChange = (section: keyof Config, field: string) => {
    setConfig((prev) => {
      const sectionValue = prev[section];
      if (
        typeof sectionValue === 'object' &&
        sectionValue !== null &&
        field in sectionValue
      ) {
        return {
          ...prev,
          [section]: {
            ...sectionValue,
            [field]: !(sectionValue as Record<string, boolean>)[field],
          },
        };
      }
      return prev;
    });
  };

  const handleNestedInputChange = (section: keyof Config, field: string, value: string | number) => {
    setConfig((prev) => {
      const sectionValue = prev[section];
      if (typeof sectionValue === 'object' && sectionValue !== null) {
        return {
          ...prev,
          [section]: { ...sectionValue, [field]: value } as typeof sectionValue,
        };
      }
      return prev;
    });
  };

  const handleArrayChange = (
    section: keyof Config,
    subSection: string,
    key: string,
    value: string | string[]
  ) => {
    setConfig((prev) => {
      const sectionValue = prev[section];
      if (
        typeof sectionValue === 'object' &&
        sectionValue !== null &&
        subSection in sectionValue
      ) {
        const subSectionValue = (sectionValue as Record<string, unknown>)[subSection];
        if (typeof subSectionValue === 'object' && subSectionValue !== null) {
          return {
            ...prev,
            [section]: {
              ...sectionValue,
              [subSection]: { ...subSectionValue, [key]: value },
            },
          };
        }
      }
      return prev;
    });
  };

  const addArrayItem = (section: keyof Config, subSection: string) => {
    const sectionValue = config[section];
    if (
      typeof sectionValue === 'object' &&
      sectionValue !== null &&
      subSection in sectionValue
    ) {
      const subSectionValue = (sectionValue as Record<string, unknown>)[subSection];
      if (typeof subSectionValue === 'object' && subSectionValue !== null) {
        const newKey = Object.keys(subSectionValue).length.toString();
        setConfig((prev) => {
          const prevSection = prev[section];
          if (typeof prevSection !== 'object' || prevSection === null) return prev;
          const prevSubSection = (prevSection as Record<string, unknown>)[subSection];
          if (typeof prevSubSection !== 'object' || prevSubSection === null) return prev;
          return {
            ...prev,
            [section]: {
              ...prevSection,
              [subSection]: {
                ...prevSubSection,
                [newKey]: subSection === 'reactions' ? [''] : '',
              },
            },
          };
        });
      }
    }
  };

  const removeArrayItem = (section: keyof Config, subSection: string, key: string) => {
    setConfig((prev) => {
      const sectionValue = prev[section];
      if (
        typeof sectionValue === 'object' &&
        sectionValue !== null &&
        subSection in sectionValue
      ) {
        const subSectionValue = (sectionValue as Record<string, unknown>)[subSection];
        if (typeof subSectionValue === 'object' && subSectionValue !== null) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _, ...rest } = subSectionValue as Record<string, unknown>;
          return {
            ...prev,
            [section]: {
              ...sectionValue,
              [subSection]: rest,
            },
          };
        }
      }
      return prev;
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Config Editor</h1>
        {success && <p className="text-green-500 mb-4">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top-level fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Token</label>
              <input
                type="text"
                name="token"
                value={config.token}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Owner ID</label>
              <input
                type="text"
                name="ownerID"
                value={config.ownerID}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Prefix</label>
              <input
                type="text"
                name="prefix"
                value={config.prefix}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Simple boolean sections */}
          {['userinfo', 'help', 'ping', 'clear', 'hoststatus' ].map((section) => (
            <div key={section} className="border-t pt-4">
              <h2 className="text-lg font-semibold capitalize">{section}</h2>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(config[section as keyof Config] as { enabled: boolean }).enabled}
                  onChange={() => handleBooleanChange(section as keyof Config, 'enabled')}
                  className="h-4 w-4"
                />
                <span>Enabled</span>
              </label>
            </div>
          ))}

          {/* Rotatestatus */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold">Rotatestatus</h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.rotatestatus.enabled}
                onChange={() => handleBooleanChange('rotatestatus', 'enabled')}
                className="h-4 w-4"
              />
              <span>Enabled</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interval (ms)</label>
              <input
                type="number"
                value={config.rotatestatus.interval}
                onChange={(e) => handleNestedInputChange('rotatestatus', 'interval', Number(e.target.value))}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <h3 className="text-md font-medium mt-4">Emojis</h3>
              {Object.keys(config.rotatestatus.emoji).length > 0 ? (
                Object.entries(config.rotatestatus.emoji).map(([key, value]) => (
                  <div key={key} className="flex space-x-2 mt-2 items-center">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleArrayChange('rotatestatus', 'emoji', e.target.value, value)}
                      className="w-20 p-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleArrayChange('rotatestatus', 'emoji', key, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('rotatestatus', 'emoji', key)}
                      className="ml-2 bg-red-500 text-white py-1 px-2 rounded-md"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No emojis defined</p>
              )}
              <button
                type="button"
                onClick={() => addArrayItem('rotatestatus', 'emoji')}
                className="mt-2 bg-blue-500 text-white py-1 px-3 rounded-md"
              >
                Add Emoji
              </button>
            </div>
            <div>
              <h3 className="text-md font-medium mt-4">Messages</h3>
              {Object.keys(config.rotatestatus.message).length > 0 ? (
                Object.entries(config.rotatestatus.message).map(([key, value]) => (
                  <div key={key} className="flex space-x-2 mt-2 items-center">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleArrayChange('rotatestatus', 'message', e.target.value, value)}
                      className="w-20 p-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleArrayChange('rotatestatus', 'message', key, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('rotatestatus', 'message', key)}
                      className="ml-2 bg-red-500 text-white py-1 px-2 rounded-md"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No messages defined</p>
              )}
              <button
                type="button"
                onClick={() => addArrayItem('rotatestatus', 'message')}
                className="mt-2 bg-blue-500 text-white py-1 px-3 rounded-md"
              >
                Add Message
              </button>
            </div>
          </div>

          {/* RPC */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold">RPC</h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.rpc.enabled}
                onChange={() => handleBooleanChange('rpc', 'enabled')}
                className="h-4 w-4"
              />
              <span>Enabled</span>
            </label>
            {/* Custom select for mode and type, rest as before */}
            <div>
              <label className="block text-sm font-medium text-gray-700 capitalize">mode</label>
              <select
                value={config.rpc.mode}
                onChange={(e) => handleNestedInputChange('rpc', 'mode', e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="rpc">rpc</option>
                <option value="weather">weather</option>
                <option value="none">none</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 capitalize">type</label>
              <select
                value={config.rpc.type}
                onChange={(e) => handleNestedInputChange('rpc', 'type', Number(e.target.value))}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
              >
                <option value={0}>Playing</option>
                <option value={1}>Streaming</option>
                <option value={2}>Listening</option>
                <option value={3}>Watching</option>
              </select>
            </div>
            {['name', 'url', 'application_id', 'client_id', 'details', 'state', 'large_image', 'large_image_text', 'small_image', 'small_image_text'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 capitalize">{field.replace('_', ' ')}</label>
                <input
                  type="text"
                  value={typeof config.rpc[field as keyof Config['rpc']] === 'boolean' || typeof config.rpc[field as keyof Config['rpc']] === 'object' ? '' : String(config.rpc[field as keyof Config['rpc']])}
                  onChange={(e) => handleNestedInputChange('rpc', field, e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            ))}
            <h3 className="text-md font-medium mt-4">Buttons</h3>
            {['name1', 'url1', 'name2', 'url2'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 capitalize">{field}</label>
                <input
                  type="text"
                  value={config.rpc.buttons[field as keyof Config['rpc']['buttons']]}
                  onChange={(e) => setConfig((prev) => ({
                    ...prev,
                    rpc: { ...prev.rpc, buttons: { ...prev.rpc.buttons, [field]: e.target.value } },
                  }))}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            ))}
          </div>

          {/* QR */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold">QR</h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.qr.enabled}
                onChange={() => handleBooleanChange('qr', 'enabled')}
                className="h-4 w-4"
              />
              <span>Enabled</span>
            </label>
            {['addrinfo', 'bankid', 'style', 'accountname'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 capitalize">{field}</label>
                <input
                  type="text"
                  value={typeof config.qr[field as keyof Config['qr']] === 'boolean' ? '' : String(config.qr[field as keyof Config['qr']])}
                  onChange={(e) => handleNestedInputChange('qr', field, e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            ))}
          </div>

          {/* Voice */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold">Voice</h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.voice.enabled}
                onChange={() => handleBooleanChange('voice', 'enabled')}
                className="h-4 w-4"
              />
              <span>Enabled</span>
            </label>
            {['channel_id'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 capitalize">{field.replace('_', ' ')}</label>
                <input
                  type="text"
                  value={typeof config.voice[field as keyof Config['voice']] === 'boolean' ? '' : String(config.voice[field as keyof Config['voice']])}
                  onChange={(e) => handleNestedInputChange('voice', field, e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            ))}
            <label className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                checked={config.voice.self_deaf}
                onChange={() => handleBooleanChange('voice', 'self_deaf')}
                className="h-4 w-4"
              />
              <span>Self Deaf</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.voice.self_mute}
                onChange={() => handleBooleanChange('voice', 'self_mute')}
                className="h-4 w-4"
              />
              <span>Self Mute</span>
            </label>
          </div>

          {/* Auto React */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold">Auto React</h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.auto_react.enabled}
                onChange={() => handleBooleanChange('auto_react', 'enabled')}
                className="h-4 w-4"
              />
              <span>Enabled</span>
            </label>
            <h3 className="text-md font-medium mt-4">Reactions</h3>
            {Object.keys(config.auto_react.reactions).length > 0 ? (
              Object.entries(config.auto_react.reactions).map(([key, value]) => (
                <div key={key} className="flex space-x-2 mt-2 items-center">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => handleArrayChange('auto_react', 'reactions', e.target.value, value)}
                    className="w-32 p-2 border border-gray-300 rounded-md"
                    placeholder="Channel ID"
                  />
                  <input
                    type="text"
                    value={value.join(',')}
                    onChange={(e) => handleArrayChange('auto_react', 'reactions', key, e.target.value.split(','))}
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                    placeholder="Reactions (comma-separated)"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem('auto_react', 'reactions', key)}
                    className="ml-2 bg-red-500 text-white py-1 px-2 rounded-md"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No reactions defined</p>
            )}
            <button
              type="button"
              onClick={() => addArrayItem('auto_react', 'reactions')}
              className="mt-2 bg-blue-500 text-white py-1 px-3 rounded-md"
            >
              Add Reaction
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition"
          >
            Save Config
          </button>
        </form>
      </div>
    </div>
  );
}