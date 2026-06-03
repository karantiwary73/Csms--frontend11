import React, { useState } from 'react';
import './ViewManager.css';
import Dashboard from './Dashboard';
import UserManagement from './UserManagement';
import OrganizationManagement from './OrganizationManagement';
import SystemSettings from './SystemSettings';
import CreateReservation from './CreateReservation';
import ReservationModule from './ReservationModule';
import ReservationOverview from './ReservationOverview';
import CreateAgreement from './CreateAgreement';
import AgreementModule from './AgreementModule';
import EditAgreement from './EditAgreement';
import AgreementStorage from './AgreementStorage';
import StorageAllocation from './StorageAllocation';
import AgreementOverview from './AgreementOverview';
import IssueRebate from './IssueRebate';
import RebateHistory from './RebateHistory';
import AcceptNewPayment from './AcceptNewPayment';
import PaymentHistory from './PaymentHistory';
import CreateWithdrawal from './CreateWithdrawal';
import WithdrawalHistory from './WithdrawalHistory';
import NewExpenditure from './NewExpenditure';
import ExpenditureHistory from './ExpenditureHistory';
import NewMoneyTransfer from './NewMoneyTransfer';
import MoneyTransferHistory from './MoneyTransferHistory';
import { getUnitName, getAllUnits } from './unitUtils';
import { useSystemSettings } from './SystemSettingsContext';
import { t } from './translations';
import { buildApiUrl, API_ENDPOINTS } from './api';

const ViewManager = ({ user, token, onLogout }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState(null);
  const [navigationData, setNavigationData] = useState(null); // Store data for navigation
  const [selectedUnit, setSelectedUnit] = useState(user.unitId || '');
  const [switchingUnit, setSwitchingUnit] = useState(false);
  const { getSystemName, getLanguage } = useSystemSettings();
  const language = getLanguage();

  // Navigation function to switch views with optional data
  const navigateToView = (viewId, data = null) => {
    setActiveView(viewId);
    setNavigationData(data);
    setMobileMenuOpen(false); // Close mobile menu when navigating
    
    // Expand the submenu if the target view is in a submenu
    const allMenuItems = getMenuItems();
    for (let item of allMenuItems) {
      if (item.submenu) {
        const subItem = item.submenu.find(sub => sub.id === viewId);
        if (subItem) {
          setExpandedSubmenu(item.id);
          break;
        }
      }
    }
  };

  // Handle unit switching
  const handleSwitchUnit = async (unitId) => {
    console.log('🔄 Switch unit triggered');
    console.log('  - Selected unit:', unitId);
    console.log('  - Current unit:', user.unitId);
    
    if (!unitId || unitId === user.unitId) {
      return;
    }

    setSwitchingUnit(true);
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.SWITCH_UNIT), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ unitId: unitId })
      });

      console.log('📡 Switch unit response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Unit switched successfully:', data);
        // Update user in localStorage
        const updatedUser = { ...user, unitId: unitId };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Unit switched successfully!');
        // Reload page to reflect changes
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('❌ Switch unit error:', error);
        alert(`Failed to switch unit: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error switching unit:', error);
      alert('Error switching unit');
    } finally {
      setSwitchingUnit(false);
      setSelectedUnit(''); // Reset dropdown
    }
  };

  const getMenuItems = () => [
    { 
      id: 'dashboard', 
      name: t(language, 'dashboard'), 
      icon: '📊', 
      component: Dashboard, 
      roles: ['ADMIN', 'OPERATOR', 'WORKER'] 
    },
    {
      id: 'reservations',
      name: 'Reservations',
      icon: '📋',
      roles: ['ADMIN', 'OPERATOR', 'WORKER'],
      submenu: [
        {
          id: 'create-reservation',
          name: 'Create Reservation',
          icon: '📝',
          component: CreateReservation,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true // Only show if user has unit assigned
        },
        {
          id: 'history-reservation',
          name: 'Reservation History',
          icon: '📜',
          component: ReservationModule,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true // Only show if user has unit assigned
        },
        {
          id: 'overview-reservation',
          name: 'Reservation Overview',
          icon: '📈',
          component: ReservationOverview,
          roles: ['ADMIN']
        }
      ]
    },
    {
      id: 'agreements',
      name: 'Agreements',
      icon: '📄',
      roles: ['ADMIN', 'OPERATOR', 'WORKER'],
      submenu: [
        {
          id: 'create-agreement',
          name: 'Create Agreement',
          icon: '📝',
          component: CreateAgreement,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        },
        {
          id: 'history-agreement',
          name: 'Agreement History',
          icon: '📜',
          component: AgreementModule,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        },
        {
          id: 'edit-agreement',
          name: 'Edit Agreement',
          icon: '✏️',
          component: EditAgreement,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true,
          hidden: true // Hidden from menu, accessed via navigation
        },
        {
          id: 'agreement-storage',
          name: 'Agreement Storage',
          icon: '📦',
          component: AgreementStorage,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true,
          hidden: true // Hidden from menu, accessed via navigation
        },
        {
          id: 'overview-agreement',
          name: 'Agreement Overview',
          icon: '📈',
          component: AgreementOverview,
          roles: ['ADMIN']
        }
      ]
    },
    {
      id: 'storage',
      name: 'Storage',
      icon: '🏪',
      roles: ['ADMIN', 'OPERATOR', 'WORKER'],
      submenu: [
        {
          id: 'storage-allocation',
          name: 'Storage Allocation',
          icon: '🔄',
          component: StorageAllocation,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        }
      ]
    },
    {
      id: 'rebate',
      name: 'Rebate',
      icon: '💰',
      roles: ['ADMIN', 'OPERATOR', 'WORKER'],
      submenu: [
        {
          id: 'issue-rebate',
          name: 'Issue Rebate',
          icon: '💰',
          component: IssueRebate,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        },
        {
          id: 'rebate-history',
          name: 'Rebate History',
          icon: '📊',
          component: RebateHistory,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        }
      ]
    },
    {
      id: 'payments',
      name: 'Payments',
      icon: '💳',
      roles: ['ADMIN', 'OPERATOR', 'WORKER'],
      submenu: [
        {
          id: 'accept-payment',
          name: 'Accept New Payment',
          icon: '💳',
          component: AcceptNewPayment,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        },
        {
          id: 'payment-history',
          name: 'Payment History',
          icon: '📊',
          component: PaymentHistory,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        }
      ]
    },
    {
      id: 'withdrawals',
      name: 'Withdrawals',
      icon: '📦',
      roles: ['ADMIN', 'OPERATOR', 'WORKER'],
      submenu: [
        {
          id: 'create-withdrawal',
          name: 'Create Withdrawal',
          icon: '📤',
          component: CreateWithdrawal,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        },
        {
          id: 'withdrawal-history',
          name: 'Withdrawal History',
          icon: '📊',
          component: WithdrawalHistory,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        }
      ]
    },
    {
      id: 'expenditure',
      name: 'Expenditure',
      icon: '💵',
      roles: ['ADMIN', 'OPERATOR', 'WORKER'],
      submenu: [
        {
          id: 'new-expenditure',
          name: 'New Voucher',
          icon: '📝',
          component: NewExpenditure,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        },
        {
          id: 'expenditure-history',
          name: 'Expenditure History',
          icon: '📊',
          component: ExpenditureHistory,
          roles: ['ADMIN', 'OPERATOR', 'WORKER'],
          requiresUnit: true
        }
      ]
    },
    {
      id: 'money-transfers',
      name: 'Money Transfers',
      icon: '💸',
      roles: ['ADMIN', 'OPERATOR'],
      submenu: [
        {
          id: 'new-money-transfer',
          name: 'New Transfer',
          icon: '📝',
          component: NewMoneyTransfer,
          roles: ['ADMIN', 'OPERATOR'],
          requiresUnit: true
        },
        {
          id: 'money-transfer-history',
          name: 'Transfer History',
          icon: '📊',
          component: MoneyTransferHistory,
          roles: ['ADMIN', 'OPERATOR'],
          requiresUnit: true
        }
      ]
    },
    { 
      id: 'users', 
      name: t(language, 'userManagement'), 
      icon: '👥', 
      component: UserManagement, 
      roles: ['ADMIN', 'OPERATOR'] 
    },
    { 
      id: 'organization', 
      name: t(language, 'organization'), 
      icon: '🏢', 
      component: OrganizationManagement, 
      roles: ['ADMIN'] 
    },
    { 
      id: 'settings', 
      name: t(language, 'systemSettings'), 
      icon: '⚙️', 
      component: SystemSettings, 
      roles: ['ADMIN'] 
    }
  ];

  const menuItems = getMenuItems();

  // Filter menu items based on user role and unit assignment
  const availableMenuItems = menuItems.filter(item => {
    if (item.submenu) {
      // Keep submenu if user has access to at least one submenu item
      return item.submenu.some(sub => {
        const hasRole = sub.roles.includes(user.role);
        const hasUnit = !sub.requiresUnit || user.unitId; // If requiresUnit is true, user must have unitId
        return hasRole && hasUnit;
      });
    }
    return item.roles.includes(user.role);
  });

  // Get all components from menu items (including submenu items)
  const getAllComponents = () => {
    const components = {};
    menuItems.forEach(item => {
      if (item.component) {
        components[item.id] = item.component;
      }
      if (item.submenu) {
        item.submenu.forEach(sub => {
          if (sub.component) {
            components[sub.id] = sub.component;
          }
        });
      }
    });
    return components;
  };

  const allComponents = getAllComponents();
  const ActiveComponent = allComponents[activeView] || Dashboard;

  // Get menu item name for header
  const getMenuItemName = () => {
    for (let item of menuItems) {
      if (item.id === activeView) return item.name;
      if (item.submenu) {
        const subItem = item.submenu.find(sub => sub.id === activeView);
        if (subItem) return subItem.name;
      }
    }
    return 'Dashboard';
  };

  // Get menu item icon for header
  const getMenuItemIcon = () => {
    for (let item of menuItems) {
      if (item.id === activeView) return item.icon;
      if (item.submenu) {
        const subItem = item.submenu.find(sub => sub.id === activeView);
        if (subItem) return subItem.icon;
      }
    }
    return '📊';
  };

  return (
    <div className="crm-layout">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Logo/Brand */}
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon">🏭</span>
            {!sidebarCollapsed && <span className="brand-text">{getSystemName()}</span>}
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* User Info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="user-details">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
              {user.unitId && <div className="user-unit">{getUnitName(user.unitId)}</div>}
              {user.role === 'ADMIN' && (
                <div className="switch-profile-sidebar">
                  <select 
                    value={selectedUnit} 
                    onChange={(e) => {
                      const unitId = e.target.value;
                      setSelectedUnit(unitId);
                      if (unitId) {
                        handleSwitchUnit(unitId);
                      }
                    }}
                    className="switch-profile-dropdown-sidebar"
                    title="Switch to different unit"
                    disabled={switchingUnit}
                  >
                    <option value="">{switchingUnit ? 'Switching...' : 'Switch Unit'}</option>
                    {getAllUnits()
                      .filter(unit => unit._id !== user.unitId)
                      .map(unit => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {availableMenuItems.map(item => (
            <div key={item.id}>
              {item.submenu ? (
                <>
                  <button
                    className={`nav-item nav-parent ${expandedSubmenu === item.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedSubmenu(expandedSubmenu === item.id ? null : item.id)}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="nav-text">{item.name}</span>
                        <span className="submenu-arrow">▼</span>
                      </>
                    )}
                  </button>
                  {expandedSubmenu === item.id && !sidebarCollapsed && (
                    <div className="submenu">
                      {item.submenu
                        .filter(sub => {
                          const hasRole = sub.roles.includes(user.role);
                          const hasUnit = !sub.requiresUnit || user.unitId;
                          const isVisible = !sub.hidden; // Filter out hidden items
                          return hasRole && hasUnit && isVisible;
                        })
                        .map(subItem => (
                          <button
                            key={subItem.id}
                            className={`nav-item nav-subitem ${activeView === subItem.id ? 'active' : ''}`}
                            onClick={() => {
                              setActiveView(subItem.id);
                              setMobileMenuOpen(false); // Close mobile menu
                            }}
                            title={subItem.name}
                          >
                            <span className="nav-icon">{subItem.icon}</span>
                            <span className="nav-text">{subItem.name}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false); // Close mobile menu
                  }}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!sidebarCollapsed && <span className="nav-text">{item.name}</span>}
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <button 
            className="logout-button"
            onClick={onLogout}
            title={sidebarCollapsed ? t(language, 'logout') : ''}
          >
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-text">{t(language, 'logout')}</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Header */}
        <div className="content-header">
          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger-icon">☰</span>
          </button>

          <div className="page-title">
            <span className="page-icon">
              {getMenuItemIcon()}
            </span>
            <h1>{getMenuItemName()}</h1>
          </div>
          <div className="header-actions">
            <div className="current-time">
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          <ActiveComponent 
            user={user} 
            token={token} 
            navigateToView={navigateToView}
            navigationData={navigationData}
          />
        </div>
      </div>
    </div>
  );
};

export default ViewManager;