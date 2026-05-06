import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';

const LandingPage = React.lazy(() => import('../../pages/LandingPage'));

function App(_props: AppRootProps) {
  return (
    <Routes>
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
