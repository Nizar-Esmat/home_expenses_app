import React from 'react';
import { Redirect } from 'expo-router';

export default function TransfersPage() {
  return <Redirect href={{ pathname: '/all-transactions', params: { typeFilter: 'transfer' } }} />;
}
